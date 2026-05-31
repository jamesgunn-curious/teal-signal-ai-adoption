import { db } from '@/db'
import { insights, articles, sources } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import type { Perspective, ArticleData } from '@/lib/types'
import { DigestFilters } from './digest-filters'
import { PageHeader } from '@/components/ui/page-header'

const DIGEST_SECTIONS = [
  { label: 'Problem selection & design',   tags: ['right-problem', 'prioritisation', 'differentiation'] },
  { label: 'Velocity & delivery',          tags: ['shipping-fast', 'iteration', 'refactoring', 'parallel-work'] },
  { label: 'AI tools & automation',        tags: ['ai-tools', 'llm', 'agents', 'automation', 'ai-limitations'] },
  { label: 'People, culture & org change', tags: ['culture', 'leadership', 'org-change', 'reskilling', 'human-factors', 'resistance'] },
  { label: 'Cases & research',             tags: ['success-story', 'failure', 'cautionary-tale', 'research', 'early-adopter'] },
]

const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  practitioner: 'Practitioner', leadership: 'Leadership', product: 'Product',
  research: 'Research', editorial: 'Editorial',
}

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; source?: string }>
}) {
  const { tag: filterTag, source: filterSource } = await searchParams

  const rows = await db
    .select({
      insight: insights,
      articleUrl: articles.url,
      articleData: articles.data,
      articleSourceSlug: articles.sourceSlug,
    })
    .from(insights)
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .where(inArray(insights.status, ['extracted', 'curated']))

  const allSources = await db.select({ id: sources.id, name: sources.name })
    .from(sources).where(eq(sources.topicId, 'ai-adoption'))

  const allTags = [...new Set(rows.flatMap(r => r.insight.tags))].sort()

  const filtered = rows.filter(({ insight, articleSourceSlug }) => {
    if (filterTag && !insight.tags.includes(filterTag)) return false
    if (filterSource && articleSourceSlug !== filterSource) return false
    return true
  })

  const activeSections = DIGEST_SECTIONS.filter(s =>
    filtered.some(({ insight }) => insight.tags.some(t => s.tags.includes(t)))
  ).length

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Output', 'Digest']}
        stats={[
          { n: rows.length,    label: 'curated',  accent: rows.length > 0 },
          { n: activeSections, label: 'sections' },
        ]}
      />

      <div className="px-8 pb-8">
      <DigestFilters allTags={allTags} allSources={allSources} activeTag={filterTag} activeSource={filterSource} />

      {filtered.length === 0 ? (
        <p className="text-neutral-400 text-sm mt-6">
          {rows.length === 0
            ? 'No curated insights yet. Curate some insights from the Insights queue.'
            : 'No insights match the current filters.'}
        </p>
      ) : (
        <div className="space-y-10 mt-6">
          {DIGEST_SECTIONS.map(section => {
            const sectionInsights = filtered.filter(({ insight }) =>
              insight.tags.some(t => section.tags.includes(t))
            )
            if (sectionInsights.length === 0) return null

            return (
              <section key={section.label}>
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  {section.label}
                </h2>
                <div className="space-y-4">
                  {sectionInsights.map(({ insight, articleUrl, articleData, articleSourceSlug }) => {
                    const data = articleData as ArticleData
                    return (
                      <div key={insight.id} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm text-[#00e05a] leading-relaxed flex-1">{insight.text}</p>
                          {insight.status === 'curated' && (
                            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#00e05a] text-[#0a0a0a] shrink-0 mt-0.5">reviewed</span>
                          )}
                        </div>
                        {insight.quote && (
                          <blockquote className="pl-3 border-l-2 border-[#00e05a33] text-xs text-[#00a040] italic mb-3">
                            {insight.quote}
                          </blockquote>
                        )}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#007830] capitalize">
                              {PERSPECTIVE_LABEL[insight.perspective as Perspective]} · {articleSourceSlug}
                            </span>
                            {insight.model && (
                              <span className="text-[9px] text-[#006025] font-mono">{insight.model}</span>
                            )}
                            {insight.tags.map(tag => (
                              <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#007830] px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                          <a href={articleUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#006025] hover:text-[#00a040] underline shrink-0">
                            {data.title?.slice(0, 40)}{(data.title?.length ?? 0) > 40 ? '…' : ''}
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
