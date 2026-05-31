import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ArticleData, Perspective } from '@/lib/types'
import { randomUUID } from 'crypto'

const TOPIC_TAGS = [
  'right-problem', 'prioritisation', 'differentiation',
  'shipping-fast', 'iteration', 'refactoring', 'parallel-work',
  'ai-tools', 'llm', 'agents', 'automation', 'ai-limitations',
  'culture', 'leadership', 'org-change', 'reskilling', 'human-factors', 'resistance',
  'success-story', 'failure', 'cautionary-tale', 'research', 'early-adopter',
]

const ANALYSE_PROMPT = (fullText: string) =>
  `Extract structured insights from this article about AI adoption. Respond with valid JSON only, no markdown:
{"executiveSummary":"2-sentence summary","tags":["tag1"],"insights":[{"text":"observation","quote":"direct quote","tags":["tag1"]}]}
Available tags: ${TOPIC_TAGS.join(', ')}
Extract 2-5 insights. Tags must come from the available list only.
<article>${fullText.slice(0, 8000)}</article>`

type InsightResult = {
  executiveSummary: string
  tags: string[]
  insights: { text: string; quote: string; tags: string[] }[]
}

async function extractInsightsClaude(fullText: string): Promise<InsightResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: ANALYSE_PROMPT(fullText) }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return JSON.parse(content.text) as InsightResult
}

async function extractInsightsLocal(fullText: string): Promise<InsightResult> {
  const model = process.env.LOCAL_LLM_MODEL ?? 'qwen2.5:7b'
  const endpoint = process.env.LOCAL_LLM_ENDPOINT ?? 'http://localhost:11434/v1/chat/completions'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: ANALYSE_PROMPT(fullText) }],
      format: 'json',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return JSON.parse(data.choices[0].message.content) as InsightResult
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params

  const useLocal = process.env.LOCAL_LLM === 'true'
  const extractInsights = useLocal ? extractInsightsLocal : extractInsightsClaude
  const modelName = useLocal ? (process.env.LOCAL_LLM_MODEL ?? 'qwen2.5:7b') : 'claude-sonnet-4-6'
  if (!useLocal && !process.env.ANTHROPIC_API_KEY) {
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
          model: modelName,
        }).onConflictDoNothing()
      ))
      processed++
    } catch (err) {
      await db.update(articles)
        .set({
          data: { ...existingData, analyseError: err instanceof Error ? err.message : 'analysis failed' },
          updatedAt: new Date(),
        })
        .where(eq(articles.id, article.id))
      failed++
    }
  }

  return NextResponse.json({ processed, failed, skipped, backend: useLocal ? 'local' : 'claude' })
}
