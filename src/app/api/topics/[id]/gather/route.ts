import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics, sources, articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ArticleData } from '@/lib/types'

interface RssItem {
  title: string
  link: string
  pubDate: string
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
    const title = (block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   block.match(/<title[^>]*>(.*?)<\/title>/))?.[1]?.trim() ?? ''
    const link  = (block.match(/<link[^>]*>(.*?)<\/link>/))?.[1]?.trim() ??
                  (block.match(/<link[^>]*href="([^"]+)"/))?.[1]?.trim() ?? ''
    const pubDate = (block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/))?.[1]?.trim() ?? ''

    if (!link) continue
    const pub = new Date(pubDate)
    if (isNaN(pub.getTime()) || pub < cutoff) continue

    items.push({ title, link, pubDate })
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
        const data: ArticleData = {
          title: item.title,
          perspective: source.perspective as ArticleData['perspective'],
          tier: source.tier as ArticleData['tier'],
          tags: [],
        }

        const inserted = await db.insert(articles).values({
          id,
          topicId,
          sourceSlug: source.id,
          url: item.link,
          publishedDate: dateStr,
          status: 'discovered',
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
