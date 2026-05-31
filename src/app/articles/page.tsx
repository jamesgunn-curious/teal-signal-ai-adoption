import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { ArticleStatus, ArticleData } from '@/lib/types'
import { ArticleActions } from './article-actions'
import { StatusChip } from '@/components/ui/status-chip'
import { ARTICLE_TOKENS } from '@/lib/status-tokens'
import { PageHeader } from '@/components/ui/page-header'

const STATUS_ORDER: ArticleStatus[] = ['discovered', 'fetched', 'processed', 'archived', 'paywalled', 'failed']

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

  const discovered = rows.filter(r => r.status === 'discovered').length
  const fetched    = rows.filter(r => r.status === 'fetched').length
  const processed  = rows.filter(r => r.status === 'processed').length

  return (
    <div className="max-w-5xl">
      <PageHeader
        crumbs={['Workflow', 'Article queue']}
        stats={[
          { n: discovered, label: 'discovered', accent: discovered > 0 },
          { n: fetched,    label: 'gathered' },
          { n: processed,  label: 'analysed' },
        ]}
      />

      <div className="px-8 pb-8">
      <div className="flex gap-2 mb-6 flex-wrap">
        <a href="/articles" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          !filterStatus ? 'bg-[#00e05a] text-[#0a0a0a]' : 'bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] hover:border-[#00e05a44]'
        }`}>All</a>
        {STATUS_ORDER.map(s => (
          <a key={s} href={`/articles?status=${s}`} className={`transition-opacity ${filterStatus === s ? 'opacity-100 ring-1 ring-white/20 rounded-full' : 'opacity-60 hover:opacity-90'}`}>
            <StatusChip status={s} label={ARTICLE_TOKENS[s].label} />
          </a>
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
              <div key={article.id} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusChip status={article.status} />
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
                    {data.fetchError && (
                      <p className="text-xs text-red-500 mt-1">Gather error: {data.fetchError}</p>
                    )}
                    {data.analyseError && (
                      <p className="text-xs text-amber-500 mt-1">Analyse error: {data.analyseError}</p>
                    )}
                    {data.tags && data.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {data.tags.map(tag => (
                          <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] px-1.5 py-0.5 rounded">{tag}</span>
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
    </div>
  )
}
