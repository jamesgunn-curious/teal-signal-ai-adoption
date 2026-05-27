import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { articleIngestionFlow, validateTransition } from '@/lib/flow'
import type { ArticleStatus, ArticleData } from '@/lib/types'

async function fetchArticleContent(url: string): Promise<{ fullText: string; wordCount: number; accessLevel: 'full' | 'partial' | 'thin' }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'signal-digest/1.0' },
  })

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

  const html = await res.text()

  // Strip tags and collapse whitespace for a basic plain-text extract
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
  const { id } = await params

  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const check = validateTransition(articleIngestionFlow, article.status as ArticleStatus, 'fetch', 'researcher')
  if (!check.valid) return NextResponse.json({ error: check.reason }, { status: 422 })

  let fetchResult: Awaited<ReturnType<typeof fetchArticleContent>>
  try {
    fetchResult = await fetchArticleContent(article.url)
  } catch (err) {
    // Mark as failed on fetch error
    const [updated] = await db.update(articles)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(articles.id, id))
      .returning()
    return NextResponse.json({ article: updated, error: String(err) }, { status: 200 })
  }

  const existingData = article.data as ArticleData
  const updatedData: ArticleData = {
    ...existingData,
    wordCount: fetchResult.wordCount,
    accessLevel: fetchResult.accessLevel,
  }

  const [updated] = await db.update(articles)
    .set({
      status: 'fetched',
      fullText: fetchResult.fullText,
      data: updatedData,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))
    .returning()

  return NextResponse.json(updated)
}
