import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ArticleStatus, ArticleData } from '@/lib/types'

async function fetchArticleContent(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'signal-digest/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = text.split(' ').filter(Boolean).length
  const accessLevel: 'full' | 'partial' | 'thin' =
    wordCount > 500 ? 'full' : wordCount > 150 ? 'partial' : 'thin'
  return { fullText: text, wordCount, accessLevel }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params

  const discovered = await db.select()
    .from(articles)
    .where(and(eq(articles.topicId, topicId), eq(articles.status, 'discovered')))

  let processed = 0
  let failed = 0

  for (const article of discovered) {
    try {
      const result = await fetchArticleContent(article.url)
      const existingData = article.data as ArticleData
      if (result.wordCount < 150) {
        // Thin content — likely paywalled or blocked. Stay in discovered with error note.
        await db.update(articles)
          .set({
            data: { ...existingData, fetchError: `thin content (${result.wordCount} words)`, accessLevel: result.accessLevel },
            updatedAt: new Date(),
          })
          .where(eq(articles.id, article.id))
        failed++
      } else {
        await db.update(articles)
          .set({
            status: 'fetched',
            fullText: result.fullText,
            data: { ...existingData, wordCount: result.wordCount, accessLevel: result.accessLevel },
            updatedAt: new Date(),
          })
          .where(eq(articles.id, article.id))
        processed++
      }
    } catch (err) {
      const existingData = article.data as ArticleData
      await db.update(articles)
        .set({
          data: { ...existingData, fetchError: err instanceof Error ? err.message : 'fetch failed' },
          updatedAt: new Date(),
        })
        .where(eq(articles.id, article.id))
      failed++
    }
  }

  return NextResponse.json({ processed, failed, skipped: 0 })
}
