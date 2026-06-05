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

  // RSS 2.0: <item> blocks
  for (const match of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)) {
    const block = match[1]
    const title = extractCdata((block.match(/<title[^>]*>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? '')
    const link  = (block.match(/<link[^>]*>(.*?)<\/link>/))?.[1]?.trim() ??
                  (block.match(/<link[^>]*href="([^"]+)"/))?.[1]?.trim() ?? ''
    const pubDate = (block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/))?.[1]?.trim() ?? ''

    if (!link) continue
    const pub = new Date(pubDate)
    if (isNaN(pub.getTime()) || pub < cutoff) continue

    const encodedRaw = (block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/))?.[1] ?? ''
    const descRaw    = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/))?.[1] ?? ''
    const richRaw    = extractCdata(encodedRaw) || extractCdata(descRaw)
    const contentText = richRaw ? htmlToText(richRaw) : undefined
    const wordCount = contentText ? contentText.split(' ').filter(Boolean).length : 0
    items.push({ title, link, pubDate, contentText: contentText || undefined, wordCount: wordCount || undefined })
  }

  // Atom 1.0: <entry> blocks (e.g. martinfowler.com/feed.atom)
  for (const match of xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/g)) {
    const block = match[1]
    const title = extractCdata((block.match(/<title[^>]*>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? '')
    // Atom link: <link href="..." rel="alternate"> or <link href="..."/>
    const link = (block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/))?.[1] ??
                 (block.match(/<link[^>]*href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'])?/))?.[1] ?? ''
    // Atom date: <published> preferred, fall back to <updated>
    const pubDate = (block.match(/<published[^>]*>(.*?)<\/published>/))?.[1]?.trim() ??
                    (block.match(/<updated[^>]*>(.*?)<\/updated>/))?.[1]?.trim() ?? ''

    if (!link) continue
    const pub = new Date(pubDate)
    if (isNaN(pub.getTime()) || pub < cutoff) continue

    const contentRaw = (block.match(/<content[^>]*>([\s\S]*?)<\/content>/))?.[1] ??
                       (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/))?.[1] ?? ''
    const contentText = contentRaw ? htmlToText(extractCdata(contentRaw)) : undefined
    const wordCount = contentText ? contentText.split(' ').filter(Boolean).length : 0
    items.push({ title, link, pubDate, contentText: contentText || undefined, wordCount: wordCount || undefined })
  }

  return items
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

// Compute how many days back to scan for a given source.
// - force=true: always use full lookbackDays (re-scan everything in window)
// - lastDiscoveredAt set: scan from 1 day before last run (catches feed lag), capped at lookbackDays
// - lastDiscoveredAt null (new source): full lookbackDays backfill
function effectiveLookbackDays(
  source: { lastDiscoveredAt: Date | null },
  topicLookbackDays: number,
  force: boolean,
): number {
  if (force || !source.lastDiscoveredAt) return topicLookbackDays
  const msSinceLastRun = Date.now() - source.lastDiscoveredAt.getTime()
  const daysSinceLastRun = msSinceLastRun / (1000 * 60 * 60 * 24)
  // Add 1-day buffer to catch articles that arrived after our last scan
  return Math.min(Math.ceil(daysSinceLastRun) + 1, topicLookbackDays)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'

  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId))
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })

  const activeSources = await db.select().from(sources).where(
    and(eq(sources.topicId, topicId), eq(sources.status, 'active'))
  )

  let totalNew = 0
  const results: { source: string; new: number; lookbackDays: number; error?: string }[] = []

  for (const source of activeSources) {
    const lookbackDays = effectiveLookbackDays(source, topic.lookbackDays, force)
    try {
      const items = await fetchRssFeed(source.feedUrl, lookbackDays)
      let newCount = 0

      for (const item of items) {
        const dateStr = new Date(item.pubDate).toISOString().split('T')[0]
        const id = `${source.slug}--${dateStr}--${slugify(item.title)}`

        const hasRssContent = (item.wordCount ?? 0) >= 150
        const accessLevel = (item.wordCount ?? 0) > 500 ? 'full' : 'partial'

        const data: ArticleData = {
          title: item.title,
          perspective: source.perspective as ArticleData['perspective'],
          tier: source.tier as ArticleData['tier'],
          tags: [],
          ...(hasRssContent ? { accessLevel } : {}),
        }

        const inserted = await db.insert(articles).values({
          id,
          topicId,
          sourceSlug: source.id,
          url: item.link,
          publishedDate: dateStr,
          status: hasRssContent ? 'fetched' : 'discovered',
          fullText: hasRssContent ? item.contentText : null,
          wordCount: item.wordCount ?? null,
          data,
        }).onConflictDoNothing().returning()

        if (inserted.length > 0) newCount++
      }

      // Update high-water mark on success
      await db.update(sources)
        .set({ lastDiscoveredAt: new Date(), updatedAt: new Date() })
        .where(eq(sources.id, source.id))

      results.push({ source: source.slug, new: newCount, lookbackDays })
      totalNew += newCount
    } catch (err) {
      results.push({ source: source.slug, new: 0, lookbackDays, error: String(err) })
    }
  }

  return NextResponse.json({ topicId, totalNew, force, sources: results })
}
