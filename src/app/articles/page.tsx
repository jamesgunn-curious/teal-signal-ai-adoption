import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { ArticleStatus, ArticleData } from '@/lib/types'
import { ArticleActions } from './article-actions'

const STATUS_ORDER: ArticleStatus[] = ['discovered', 'fetched', 'processed', 'archived', 'paywalled', 'failed']

const STATUS_LABELS: Record<ArticleStatus, string> = {
  discovered: 'Discovered',
  fetched:    'Gathered',
  processed:  'Analysed',
  archived:   'Archived',
  paywalled:  'Paywalled',
  failed:     'Failed',
}

const STATUS_COLOURS: Record<ArticleStatus, string> = {
  discovered: 'bg-blue-50 text-blue-700',
  fetched:    'bg-amber-50 text-amber-700',
  processed:  'bg-green-50 text-green-700',
  archived:   'bg-neutral-100 text-neutral-500',
  paywalled:  'bg-purple-50 text-purple-700',
  failed:     'bg-red-50 text-red-700',
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams

  const rows = filterStatus
    ? await db.select().from(articles).where(eq(articles.status, filterStatus))
    : await db.select().from(articles)

  // Insight counts per article
  const insightCounts = await db
    .select({ articleId: insights.articleId, count: sql<number>`count(*)::int` })
    .from(insights)
    .groupBy(insights.articleId)

  const insightCountMap = Object.fromEntries(insightCounts.map(r => [r.articleId, r.count]))

  const sorted = [...rows].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status as ArticleStatus)
    const bi = STATUS_ORDER.indexOf(b.status as ArticleStatus)
    return ai !== bi ? ai - bi : new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  })

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <span className="text-sm text-neutral-500">{sorted.length} articles</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <a href="/articles" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          !filterStatus ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}>All</a>
        {STATUS_ORDER.map(s => (
          <a key={s} href={`/articles?status=${s}`} className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide transition-colors ${
            filterStatus === s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}>{STATUS_LABELS[s]}</a>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="text-neutral-400 text-sm">No articles. Run Discover from the dashboard.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(article => {
            const data = article.data as ArticleData
            const insightCount = insightCountMap[article.id] ?? 0
            return (
              <div key={article.id} className="bg-white rounded-lg border border-neutral-200 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${STATUS_COLOURS[article.status as ArticleStatus]}`}>
                        {STATUS_LABELS[article.status as ArticleStatus]}
                      </span>
                      <span className="text-xs text-neutral-400 capitalize">{data.perspective} · Tier {data.tier}</span>
                      <span className="text-xs text-neutral-400">{article.publishedDate}</span>
                      {data.wordCount && (
                        <span className="text-xs text-neutral-400">{data.wordCount.toLocaleString()} words · {data.accessLevel}</span>
                      )}
                      {insightCount > 0 && (
                        <a href={`/insights?articleId=${article.id}&status=extracted`}
                          className="text-xs text-neutral-500 hover:text-neutral-900 underline">
                          {insightCount} insight{insightCount !== 1 ? 's' : ''}
                        </a>
                      )}
                    </div>
                    <a href={article.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-900 hover:underline line-clamp-2">
                      {data.title}
                    </a>
                    {data.executiveSummary && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{data.executiveSummary}</p>
                    )}
                    {data.tags && data.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {data.tags.map(tag => (
                          <span key={tag} className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArticleActions articleId={article.id} status={article.status as ArticleStatus} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
