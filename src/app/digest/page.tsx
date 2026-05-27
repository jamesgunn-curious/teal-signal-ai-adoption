import { db } from '@/db'
import { insights, articles, sources } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Perspective, ArticleData } from '@/lib/types'
import { DigestFilters } from './digest-filters'

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
    .where(eq(insights.status, 'curated'))

  const allSources = await db.select({ id: sources.id, name: sources.name })
    .from(sources).where(eq(sources.topicId, 'ai-adoption'))

  const allTags = [...new Set(rows.flatMap(r => r.insight.tags))].sort()

  const filtered = rows.filter(({ insight, articleSourceSlug }) => {
    if (filterTag && !insight.tags.includes(filterTag)) return false
    if (filterSource && articleSourceSlug !== filterSource) return false
    return true
  })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Digest</h1>
        <p className="text-neutral-500 text-sm mt-1">Curated insights · AI Adoption</p>
      </div>

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
                      <div key={insight.id} className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
                        <p className="text-sm text-neutral-900 leading-relaxed mb-3">{insight.text}</p>
                        {insight.quote && (
                          <blockquote className="pl-3 border-l-2 border-neutral-200 text-xs text-neutral-500 italic mb-3">
                            {insight.quote}
                          </blockquote>
                        )}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-neutral-400 capitalize">
                              {PERSPECTIVE_LABEL[insight.perspective as Perspective]} · {articleSourceSlug}
                            </span>
                            {insight.tags.map(tag => (
                              <span key={tag} className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                          <a href={articleUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-neutral-400 hover:text-neutral-600 underline shrink-0">
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
  )
}
