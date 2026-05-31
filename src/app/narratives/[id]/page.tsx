import { db } from '@/db'
import { narratives, narrativeInsights, insights, articles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import type { ArticleData, Perspective } from '@/lib/types'

export default async function NarrativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [narrative] = await db.select().from(narratives).where(eq(narratives.id, id))
  if (!narrative) notFound()

  const rows = await db
    .select({
      link: narrativeInsights,
      insight: insights,
      articleData: articles.data,
      articleUrl: articles.url,
      articleSourceSlug: articles.sourceSlug,
      articlePublishedDate: articles.publishedDate,
    })
    .from(narrativeInsights)
    .innerJoin(insights, eq(narrativeInsights.insightId, insights.id))
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .where(eq(narrativeInsights.narrativeId, id))

  // Sort by article published date descending
  rows.sort((a, b) =>
    new Date(b.articlePublishedDate).getTime() - new Date(a.articlePublishedDate).getTime()
  )

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Output', 'Narratives']}
        back={{ label: 'All narratives', href: '/narratives' }}
        stats={[
          { n: rows.length, label: 'insights', accent: rows.length > 0 },
        ]}
      />

      <div className="px-8 pb-8">

        {/* Narrative statement */}
        <div className="mb-8 pb-6 border-b border-[#00e05a15]">
          <h1 className="text-xl font-semibold text-[#00e05a] leading-snug mb-2">{narrative.title}</h1>
          {narrative.description && (
            <p className="text-sm text-[#007830]">{narrative.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-[#006025] uppercase tracking-wide font-semibold">{narrative.status}</span>
            <span className="text-[10px] text-[#006025]">created {narrative.createdAt.toISOString().slice(0, 10)}</span>
          </div>
        </div>

        {/* Insights timeline */}
        {rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#006025] mb-1">No insights attached yet.</p>
            <p className="text-xs text-[#006025]">
              Add insights from the <a href="/insights" className="underline hover:text-[#00a040]">Review screen</a> or individual articles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(({ link, insight, articleData, articleUrl, articleSourceSlug, articlePublishedDate }) => {
              const data = articleData as ArticleData
              return (
                <div key={link.id} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
                  <p className="text-sm text-[#00e05a] leading-relaxed mb-3">{insight.text}</p>
                  {insight.quote && (
                    <blockquote className="pl-3 border-l-2 border-[#00e05a33] text-xs text-[#00a040] italic mb-3">
                      {insight.quote}
                    </blockquote>
                  )}
                  {link.note && (
                    <p className="text-xs text-[#00c050] bg-[#0f1a12] rounded px-3 py-2 mb-3 border border-[#00e05a22]">
                      ✎ {link.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#007830] capitalize">{insight.perspective}</span>
                      <span className="text-xs text-[#006025]">·</span>
                      <span className="text-xs text-[#006025]">{articleSourceSlug}</span>
                      <span className="text-xs text-[#006025]">·</span>
                      <span className="text-xs text-[#006025]">{articlePublishedDate}</span>
                      {insight.model && (
                        <span className="text-[9px] text-[#006025] font-mono">{insight.model}</span>
                      )}
                      {insight.status === 'curated' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-[#00e05a] text-[#0a0a0a]">reviewed</span>
                      )}
                      {insight.tags.map(tag => (
                        <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#007830] px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                    <a href={articleUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#006025] hover:text-[#00a040] underline shrink-0">
                      {data.title?.slice(0, 35)}{(data.title?.length ?? 0) > 35 ? '…' : ''}
                    </a>
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
