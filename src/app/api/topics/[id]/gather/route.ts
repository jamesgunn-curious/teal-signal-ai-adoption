import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics, sources, articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ArticleData } from '@/lib/types'

interface RssItem {
  title: string
  link: string
  pubDate: string
  contentText?: string  // extracted from <content:encoded> or <description>
  wordCount?: number
}

function extractCdata(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchRssFeed(feedUrl: string, lookbackDays: number): Promise<RssItem[]> {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'signal-digest/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)

  const xml = await res.text()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - lookbackDays)

  const items: RssItem[] = []
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const block = match[1]
    const title = extractCdata(
      (block.match(/<title[^>]*>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? ''
    )
    const link  = (block.match(/<link[^>]*>(.*?)<\/link>/))?.[1]?.trim() ??
                  (block.match(/<link[^>]*href="([^"]+)"/))?.[1]?.trim() ?? ''
    const pubDate = (block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/))?.[1]?.trim() ?? ''

    if (!link) continue
    const pub = new Date(pubDate)
    if (isNaN(pub.getTime()) || pub < cutoff) continue

    // Prefer <content:encoded> (full text), fall back to <description> (teaser)
    const encodedRaw = (block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/))?.[1] ?? ''
    const descRaw    = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/))?.[1] ?? ''
    const richRaw    = extractCdata(encodedRaw) || extractCdata(descRaw)
    const contentText = richRaw ? htmlToText(richRaw) : undefined
    const wordCount = contentText ? contentText.split(' ').filter(Boolean).length : 0

    items.push({ title, link, pubDate, contentText: contentText || undefined, wordCount: wordCount || undefined })
  }

  return items
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params

  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId))
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })

  const activeSources = await db.select().from(sources).where(
    and(eq(sources.topicId, topicId), eq(sources.status, 'active'))
  )

  let totalNew = 0
  const results: { source: string; new: number; error?: string }[] = []

  for (const source of activeSources) {
    try {
      const items = await fetchRssFeed(source.feedUrl, topic.lookbackDays)
      let newCount = 0

      for (const item of items) {
        const dateStr = new Date(item.pubDate).toISOString().split('T')[0]
        const id = `${source.slug}--${dateStr}--${slugify(item.title)}`

        // If RSS gave us usable content, pre-populate fullText and mark fetched directly
        const hasRssContent = (item.wordCount ?? 0) >= 150
        const accessLevel = (item.wordCount ?? 0) > 500 ? 'full' : 'partial'

        const data: ArticleData = {
          title: item.title,
          perspective: source.perspective as ArticleData['perspective'],
          tier: source.tier as ArticleData['tier'],
          tags: [],
          ...(hasRssContent ? { wordCount: item.wordCount, accessLevel } : {}),
        }

        const inserted = await db.insert(articles).values({
          id,
          topicId,
          sourceSlug: source.id,
          url: item.link,
          publishedDate: dateStr,
          status: hasRssContent ? 'fetched' : 'discovered',
          fullText: hasRssContent ? item.contentText : null,
          data,
        }).onConflictDoNothing().returning()

        if (inserted.length > 0) newCount++
      }

      results.push({ source: source.slug, new: newCount })
      totalNew += newCount
    } catch (err) {
      results.push({ source: source.slug, new: 0, error: String(err) })
    }
  }

  return NextResponse.json({ topicId, totalNew, sources: results })
}
