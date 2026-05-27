import { db } from '@/db'
import { insights, articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { InsightStatus, Perspective } from '@/lib/types'
import { InsightActions } from './insight-actions'

const PERSPECTIVE_COLOURS: Record<Perspective, string> = {
  practitioner: 'bg-blue-50 text-blue-700',
  leadership:   'bg-purple-50 text-purple-700',
  product:      'bg-amber-50 text-amber-700',
  research:     'bg-green-50 text-green-700',
  editorial:    'bg-neutral-100 text-neutral-600',
}

const DIGEST_SECTIONS = [
  { label: 'Problem selection & design',   tags: ['right-problem', 'prioritisation', 'differentiation'] },
  { label: 'Velocity & delivery',          tags: ['shipping-fast', 'iteration', 'refactoring', 'parallel-work'] },
  { label: 'AI tools & automation',        tags: ['ai-tools', 'llm', 'agents', 'automation', 'ai-limitations'] },
  { label: 'People, culture & org change', tags: ['culture', 'leadership', 'org-change', 'reskilling', 'human-factors', 'resistance'] },
  { label: 'Cases & research',             tags: ['success-story', 'failure', 'cautionary-tale', 'research', 'early-adopter'] },
]

function digestSection(tags: string[]): string | null {
  for (const section of DIGEST_SECTIONS) {
    if (tags.some(t => section.tags.includes(t))) return section.label
  }
  return null
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; articleId?: string }>
}) {
  const { status: filterStatus, articleId } = await searchParams
  const activeStatus = (filterStatus as InsightStatus | undefined) ?? 'extracted'

  const conditions = [eq(insights.status, activeStatus)]
  if (articleId) conditions.push(eq(insights.articleId, articleId))

  const rows = await db
    .select({ insight: insights, articleData: articles.data })
    .from(insights)
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .where(and(...conditions))

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Insights</h1>
          {articleId && (
            <p className="text-xs text-neutral-400 mt-1">
              Filtered to one article ·{' '}
              <a href="/insights" className="underline hover:text-neutral-600">Clear</a>
            </p>
          )}
        </div>
        <span className="text-sm text-neutral-500">{rows.length} {activeStatus}</span>
      </div>

      <div className="flex gap-2 mb-6">
        {(['extracted', 'curated', 'dismissed'] as InsightStatus[]).map(s => (
          <a
            key={s}
            href={articleId ? `/insights?status=${s}&articleId=${articleId}` : `/insights?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              activeStatus === s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          {activeStatus === 'extracted'
            ? 'No extracted insights. Analyse some articles first.'
            : `No ${activeStatus} insights.`}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ insight }) => {
            const section = digestSection(insight.tags)
            return (
              <div key={insight.id} className="bg-white rounded-lg border border-neutral-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PERSPECTIVE_COLOURS[insight.perspective as Perspective]}`}>
                        {insight.perspective}
                      </span>
                      {insight.tags.map(tag => (
                        <span key={tag} className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                      {section && (
                        <span className="text-xs text-neutral-400 italic">→ {section}</span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-900 leading-relaxed">{insight.text}</p>
                    {insight.quote && (
                      <blockquote className="mt-2 pl-3 border-l-2 border-neutral-200 text-xs text-neutral-500 italic line-clamp-2">
                        {insight.quote}
                      </blockquote>
                    )}
                  </div>
                  {activeStatus === 'extracted' && (
                    <InsightActions insightId={insight.id} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
