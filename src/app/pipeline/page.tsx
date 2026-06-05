import { db } from '@/db'
import { articles, sources, insights, topics } from '@/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { PipelineBar } from '@/components/pipeline/pipeline-bar'
import { PipelineContent } from '@/components/pipeline/pipeline-content'

const TOPIC_ID = 'ai-adoption'

export default async function PipelinePage() {
  const [allArticles, allSources, insightCounts, lastArticle, topicRows] = await Promise.all([
    db.select().from(articles).where(eq(articles.topicId, TOPIC_ID)),
    db.select().from(sources).where(eq(sources.topicId, TOPIC_ID)),
    db.select({ articleId: insights.articleId, count: sql<number>`count(*)::int` })
      .from(insights)
      .groupBy(insights.articleId),
    db.select({ createdAt: articles.createdAt })
      .from(articles)
      .where(eq(articles.topicId, TOPIC_ID))
      .orderBy(desc(articles.createdAt))
      .limit(1),
    db.select({ lookbackDays: topics.lookbackDays }).from(topics).where(eq(topics.id, TOPIC_ID)),
  ])
  const lookbackDays = topicRows[0]?.lookbackDays ?? 30

  const count = (status: string) => allArticles.filter(a => a.status === status).length
  const fetchedArticles = allArticles.filter(a => a.status === 'fetched')
  const pipeline = {
    discovered:   count('discovered'),
    fetched:      fetchedArticles.length,
    processed:    count('processed'),
  }
  const fetchedArticleIds = fetchedArticles.map(a => a.id)

  const insightCountMap = Object.fromEntries(insightCounts.map(r => [r.articleId, r.count]))
  const activeSources = allSources.filter(s => s.status === 'active').length
  const lastRun = lastArticle[0]?.createdAt?.toISOString() ?? null

  return (
    <div className="max-w-5xl">
      <div className="px-8 pt-8 pb-8 space-y-6">
        <PipelineBar
          topicId={TOPIC_ID}
          discovered={pipeline.discovered}
          fetchedArticleIds={fetchedArticleIds}
          processed={pipeline.processed}
          activeSources={activeSources}
          lastRun={lastRun}
          lookbackDays={lookbackDays}
        />

        <PipelineContent
          sources={allSources}
          topicId={TOPIC_ID}
          articles={allArticles}
          insightCountMap={insightCountMap}
        />
      </div>
    </div>

  )
}
