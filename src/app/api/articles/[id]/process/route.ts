import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { articleIngestionFlow, validateTransition } from '@/lib/flow'
import type { ArticleStatus, ArticleData, Perspective } from '@/lib/types'
import { randomUUID } from 'crypto'

const TOPIC_TAGS = [
  'right-problem', 'prioritisation', 'differentiation',
  'shipping-fast', 'iteration', 'refactoring', 'parallel-work',
  'ai-tools', 'llm', 'agents', 'automation', 'ai-limitations',
  'culture', 'leadership', 'org-change', 'reskilling', 'human-factors', 'resistance',
  'success-story', 'failure', 'cautionary-tale', 'research', 'early-adopter',
]

const ANALYSE_PROMPT = (fullText: string) =>
  `You are extracting structured insights from an article about AI adoption in organisations.

Article text:
<article>
${fullText.slice(0, 8000)}
</article>

Available tags: ${TOPIC_TAGS.join(', ')}

Respond with valid JSON only, no markdown:
{
  "executiveSummary": "2-sentence summary of the key argument",
  "tags": ["tag1", "tag2"],
  "insights": [
    {
      "text": "One coherent paragraph-level observation or claim from the article",
      "quote": "A direct supporting quote from the article",
      "tags": ["tag1"]
    }
  ]
}

Extract 2-5 insights. Each insight must be a distinct, self-contained claim. Tags must come from the available tags list only.`

type ProcessResult = {
  executiveSummary: string
  tags: string[]
  insights: { text: string; quote: string; tags: string[] }[]
}

async function extractInsightsClaude(fullText: string): Promise<ProcessResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: ANALYSE_PROMPT(fullText) }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(content.text) as ProcessResult
}

async function extractInsightsLocal(fullText: string): Promise<ProcessResult> {
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
  return JSON.parse(data.choices[0].message.content) as ProcessResult
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const useLocal = process.env.LOCAL_LLM === 'true'
  const extractInsights = useLocal ? extractInsightsLocal : extractInsightsClaude
  const modelName = useLocal ? (process.env.LOCAL_LLM_MODEL ?? 'qwen2.5:7b') : 'claude-sonnet-4-6'

  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!article.fullText) return NextResponse.json({ error: 'Article has no full text — fetch first' }, { status: 422 })

  const check = validateTransition(articleIngestionFlow, article.status as ArticleStatus, 'process', 'researcher')
  if (!check.valid) return NextResponse.json({ error: check.reason }, { status: 422 })

  const result = await extractInsights(article.fullText)

  const existingData = article.data as ArticleData
  const updatedData: ArticleData = {
    ...existingData,
    executiveSummary: result.executiveSummary,
    tags: result.tags,
  }

  const [updatedArticle] = await db.update(articles)
    .set({ status: 'processed', data: updatedData, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning()

  const createdInsights = await Promise.all(
    result.insights.map(ins =>
      db.insert(insights).values({
        id: randomUUID(),
        articleId: id,
        status: 'extracted',
        text: ins.text,
        quote: ins.quote,
        tags: ins.tags,
        perspective: existingData.perspective as Perspective,
        model: modelName,
      }).returning()
    )
  )

  return NextResponse.json({
    article: updatedArticle,
    insights: createdInsights.map(r => r[0]),
    backend: useLocal ? 'local' : 'claude',
  })
}
