import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { db } from './index'
import { articles, insights } from './schema'

const SIGNAL_DIR = join(process.env.HOME!, 'projects/signal/topics/ai-adoption')
const TOPIC_ID = 'ai-adoption'

interface SignalArticle {
  id: string
  file: string
  url: string
  title: string
  source: string
  perspective: string
  tier: number
  published: string
  access: string
  processed: boolean
  word_count: number
  exec_summary: string | null
  derived_tags: string[] | null
}

interface SignalInsight {
  id: string
  article_id: string
  source: string
  perspective: string
  tier: number
  published: string
  tags: string[]
  label: string
  description: string
  quote: string
}

function readSignalArticleText(filePath: string): string | null {
  const absPath = join(SIGNAL_DIR, filePath)
  if (!existsSync(absPath)) return null
  const raw = readFileSync(absPath, 'utf-8')
  // Strip YAML frontmatter (--- ... ---)
  const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1].trim() : raw.trim()
}

function mapStatus(article: SignalArticle): string {
  if (article.access === 'paywalled') return 'paywalled'
  if (article.processed) return 'processed'
  if (article.word_count > 0) return 'fetched'
  return 'discovered'
}

async function migrate() {
  const indexRaw = readFileSync(join(SIGNAL_DIR, 'index.json'), 'utf-8')
  const index = JSON.parse(indexRaw) as { articles: SignalArticle[] }

  const insightsRaw = readFileSync(join(SIGNAL_DIR, 'insights.json'), 'utf-8')
  const insightsData = JSON.parse(insightsRaw) as { insights: SignalInsight[] }

  console.log(`Migrating ${index.articles.length} articles...`)

  let articleCount = 0
  for (const a of index.articles) {
    const status = mapStatus(a)
    const fullText = a.file ? readSignalArticleText(a.file) : null

    await db.insert(articles).values({
      id: a.id,
      topicId: TOPIC_ID,
      sourceSlug: a.source,
      url: a.url,
      publishedDate: a.published,
      status,
      fullText: status === 'paywalled' ? null : fullText,
      data: {
        title: a.title,
        perspective: a.perspective as 'practitioner' | 'leadership' | 'product' | 'research' | 'editorial',
        tier: String(a.tier) as '1' | '2' | '3',
        wordCount: a.word_count > 0 ? a.word_count : undefined,
        accessLevel: a.access === 'paywalled' ? 'paywalled' : a.access === 'full' ? 'full' : undefined,
        executiveSummary: a.exec_summary ?? undefined,
        tags: a.derived_tags ?? [],
      },
    }).onConflictDoNothing()
    articleCount++
  }

  console.log(`Inserted ${articleCount} articles.`)

  console.log(`Migrating ${insightsData.insights.length} insights...`)

  const existingArticles = await db.select({ id: articles.id }).from(articles)
  const articleIds = new Set(existingArticles.map(a => a.id))
  const validInsights = insightsData.insights.filter(i => articleIds.has(i.article_id))
  console.log(`Skipping ${insightsData.insights.length - validInsights.length} orphaned insights.`)

  let insightCount = 0
  for (const ins of validInsights) {
    await db.insert(insights).values({
      id: ins.id,
      articleId: ins.article_id,
      status: 'extracted',
      text: ins.description,
      quote: ins.quote ?? '',
      tags: ins.tags ?? [],
      perspective: ins.perspective,
    }).onConflictDoNothing()
    insightCount++
  }

  console.log(`Inserted ${insightCount} insights.`)
  process.exit(0)
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
