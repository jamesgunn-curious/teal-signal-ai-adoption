import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ArticleData, Perspective } from '@/lib/types'
import { randomUUID } from 'crypto'

const client = new Anthropic()

const TOPIC_TAGS = [
  'right-problem', 'prioritisation', 'differentiation',
  'shipping-fast', 'iteration', 'refactoring', 'parallel-work',
  'ai-tools', 'llm', 'agents', 'automation', 'ai-limitations',
  'culture', 'leadership', 'org-change', 'reskilling', 'human-factors', 'resistance',
  'success-story', 'failure', 'cautionary-tale', 'research', 'early-adopter',
]

async function extractInsights(fullText: string) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract structured insights from this article about AI adoption. Respond with valid JSON only, no markdown:
{"executiveSummary":"2-sentence summary","tags":["tag1"],"insights":[{"text":"observation","quote":"direct quote","tags":["tag1"]}]}
Available tags: ${TOPIC_TAGS.join(', ')}
Extract 2-5 insights. Tags must come from the available list only.
<article>${fullText.slice(0, 8000)}</article>`,
    }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response')
  return JSON.parse(content.text) as {
    executiveSummary: string
    tags: string[]
    insights: { text: string; quote: string; tags: string[] }[]
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const fetched = await db.select()
    .from(articles)
    .where(and(eq(articles.topicId, topicId), eq(articles.status, 'fetched')))

  let processed = 0
  let failed = 0
  let skipped = 0

  for (const article of fetched) {
    const existingData = article.data as ArticleData

    if (!article.fullText) {
      // Legacy article stuck in fetched with no content — move back to discovered for re-gather
      await db.update(articles)
        .set({
          status: 'discovered',
          data: { ...existingData, fetchError: 'no content — needs re-gather', analyseError: undefined },
          updatedAt: new Date(),
        })
        .where(eq(articles.id, article.id))
      skipped++
      continue
    }

    try {
      const result = await extractInsights(article.fullText)
      // Clear any previous analyseError on success
      const { analyseError: _removed, ...cleanData } = existingData
      await db.update(articles)
        .set({
          status: 'processed',
          data: { ...cleanData, executiveSummary: result.executiveSummary, tags: result.tags },
          updatedAt: new Date(),
        })
        .where(eq(articles.id, article.id))
      await Promise.all(result.insights.map(ins =>
        db.insert(insights).values({
          id: randomUUID(),
          articleId: article.id,
          status: 'extracted',
          text: ins.text,
          quote: ins.quote,
          tags: ins.tags,
          perspective: existingData.perspective as Perspective,
        }).onConflictDoNothing()
      ))
      processed++
    } catch (err) {
      // Record the error so the dashboard can distinguish retries from new articles
      await db.update(articles)
        .set({
          data: { ...existingData, analyseError: err instanceof Error ? err.message : 'analysis failed' },
          updatedAt: new Date(),
        })
        .where(eq(articles.id, article.id))
      failed++
    }
  }

  return NextResponse.json({ processed, failed, skipped })
}
