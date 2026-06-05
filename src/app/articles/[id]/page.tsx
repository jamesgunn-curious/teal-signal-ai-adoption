import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { articles, insights, narratives, narrativeInsights } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { PageHeader } from '@/components/ui/page-header'
import { StatusChip } from '@/components/ui/status-chip'
import { ArticleActions } from '@/app/articles/article-actions'
import { ArticleInsightRow } from './article-insight-row'
import type { ArticleData, ArticleStatus } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params

  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  if (!article) notFound()

  const articleInsights = await db.select().from(insights).where(eq(insights.articleId, id))

  const narrativeLinks = articleInsights.length > 0
    ? await db
        .select({
          insightId: narrativeInsights.insightId,
          narrativeId: narrativeInsights.narrativeId,
          narrativeTitle: narratives.title,
        })
        .from(narrativeInsights)
        .innerJoin(narratives, eq(narratives.id, narrativeInsights.narrativeId))
        .where(inArray(narrativeInsights.insightId, articleInsights.map(i => i.id)))
    : []

  const linksByInsight: Record<string, { id: string; title: string }[]> = {}
  for (const link of narrativeLinks) {
    if (!linksByInsight[link.insightId]) linksByInsight[link.insightId] = []
    linksByInsight[link.insightId].push({ id: link.narrativeId, title: link.narrativeTitle })
  }

  const data = article.data as ArticleData
  const insightCount = articleInsights.length

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Pipeline', 'Article']}
        back={{ label: 'Pipeline', href: '/pipeline' }}
        stats={[
          ...(article.wordCount != null ? [{ n: article.wordCount.toLocaleString(), label: 'words' }] : []),
          ...(insightCount > 0 ? [{ n: insightCount, label: insightCount === 1 ? 'insight' : 'insights', accent: true }] : []),
          ...(article.analyseDurationMs != null ? [{ n: `${Math.round(article.analyseDurationMs / 1000)}s`, label: 'analyse time' }] : []),
        ]}
        actions={<ArticleActions articleId={article.id} status={article.status as ArticleStatus} />}
      />

      <div className="px-8 pb-8 space-y-6">

        {/* Metadata */}
        <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <StatusChip status={article.status} />
                <span className="text-xs text-[#007830] capitalize">{data.perspective}</span>
                <span className="text-xs text-[#006025]">·</span>
                <span className="text-xs text-[#006025]">Tier {data.tier}</span>
                <span className="text-xs text-[#006025]">·</span>
                <span className="text-xs text-[#006025]">{article.publishedDate}</span>
                {data.accessLevel && (
                  <>
                    <span className="text-xs text-[#006025]">·</span>
                    <span className="text-xs text-[#006025]">{data.accessLevel}</span>
                  </>
                )}
              </div>
              <div className="flex items-start gap-2">
                <h1 className="text-lg font-semibold text-[#00e05a] leading-snug flex-1">
                  {data.title ?? article.id}
                </h1>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-[#006025] hover:text-[#00a040] mt-0.5"
                  title="Open original article"
                >
                  ↗
                </a>
              </div>
              {data.executiveSummary && (
                <p className="text-sm text-[#007830] mt-2">{data.executiveSummary}</p>
              )}
              {data.tags && data.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {data.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {data.fetchError && (
                <p className="text-xs text-red-500 mt-2">Gather error: {data.fetchError}</p>
              )}
              {data.analyseError && article.status === 'fetched' && (
                <p className="text-xs text-amber-500 mt-2">Analyse error: {data.analyseError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Full text */}
        {article.fullText ? (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#006025] mb-3">Article text</p>
            <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-[#007830] leading-relaxed whitespace-pre-wrap">{article.fullText}</p>
            </div>
          </div>
        ) : (
          article.status === 'discovered' && (
            <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
              <p className="text-sm text-[#006025]">Article not yet gathered — content unavailable.</p>
            </div>
          )
        )}

        {/* Insights */}
        {articleInsights.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#006025] mb-3">
              {insightCount} insight{insightCount !== 1 ? 's' : ''} extracted
            </p>
            <div className="space-y-3">
              {articleInsights.map(insight => (
                <ArticleInsightRow
                  key={insight.id}
                  insight={{
                    id: insight.id,
                    text: insight.text,
                    quote: insight.quote,
                    status: insight.status,
                    tags: insight.tags,
                    perspective: insight.perspective,
                    model: insight.model,
                  }}
                  narratives={linksByInsight[insight.id] ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {article.status === 'processed' && insightCount === 0 && (
          <p className="text-sm text-[#006025]">Analysis completed but no insights were extracted.</p>
        )}

      </div>
    </div>
  )
}
