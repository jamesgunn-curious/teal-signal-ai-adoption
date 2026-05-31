import { db } from '@/db'
import { insights, articles, narratives, narrativeInsights } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { InsightStatus, Perspective } from '@/lib/types'
import { InsightActions } from './insight-actions'
import { StatusChip } from '@/components/ui/status-chip'
import { INSIGHT_TOKENS } from '@/lib/status-tokens'
import { PageHeader } from '@/components/ui/page-header'

const PERSPECTIVE_COLOURS: Record<Perspective, string> = {
  practitioner: 'bg-blue-950 border border-blue-800 text-blue-400',
  leadership:   'bg-purple-950 border border-purple-800 text-purple-400',
  product:      'bg-amber-950 border border-amber-800 text-amber-400',
  research:     'bg-[#0f1a12] border border-[#00e05a33] text-[#00c050]',
  editorial:    'bg-[#111] border border-[#333] text-[#555]',
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

  const [rows, counts, narrativeLinks] = await Promise.all([
    db.select({ insight: insights, articleData: articles.data })
      .from(insights)
      .innerJoin(articles, eq(insights.articleId, articles.id))
      .where(and(...conditions)),
    db.select({ status: insights.status, count: sql<number>`count(*)::int` })
      .from(insights)
      .groupBy(insights.status),
    activeStatus === 'curated'
      ? db.select({
          insightId: narrativeInsights.insightId,
          narrativeId: narrativeInsights.narrativeId,
          narrativeTitle: narratives.title,
        })
        .from(narrativeInsights)
        .innerJoin(narratives, eq(narrativeInsights.narrativeId, narratives.id))
      : Promise.resolve([]),
  ])

  const narrativeMap = new Map<string, { id: string; title: string }[]>()
  for (const link of narrativeLinks) {
    const existing = narrativeMap.get(link.insightId) ?? []
    existing.push({ id: link.narrativeId, title: link.narrativeTitle })
    narrativeMap.set(link.insightId, existing)
  }

  const countMap = Object.fromEntries(counts.map(r => [r.status, r.count]))
  const extracted = countMap['extracted'] ?? 0
  const curated   = countMap['curated']   ?? 0
  const dismissed = countMap['dismissed'] ?? 0

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Workflow', 'Review']}
        stats={[
          { n: extracted, label: 'to review', accent: extracted > 0 },
          { n: curated,   label: 'curated' },
          { n: dismissed, label: 'dismissed' },
        ]}
      />
      <div className="px-8 pb-8">
      {articleId && (
        <p className="text-xs text-[#006025] mb-4">
          Filtered to one article ·{' '}
          <a href="/insights" className="underline hover:text-[#00a040]">Clear</a>
        </p>
      )}

      <div className="flex gap-2 mb-6">
        {(['extracted', 'curated', 'dismissed'] as InsightStatus[]).map(s => (
          <a
            key={s}
            href={articleId ? `/insights?status=${s}&articleId=${articleId}` : `/insights?status=${s}`}
            className={`transition-opacity ${activeStatus === s ? 'opacity-100 ring-1 ring-white/20 rounded-full' : 'opacity-60 hover:opacity-90'}`}
          >
            <StatusChip status={s} label={INSIGHT_TOKENS[s].label} />
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
              <div key={insight.id} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PERSPECTIVE_COLOURS[insight.perspective as Perspective]}`}>
                        {insight.perspective}
                      </span>
                      {insight.tags.map(tag => (
                        <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                      {section && (
                        <span className="text-xs text-neutral-400 italic">→ {section}</span>
                      )}
                    </div>
                    {activeStatus === 'curated' && (narrativeMap.get(insight.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                        {(narrativeMap.get(insight.id) ?? []).map(n => (
                          <a key={n.id} href={`/narratives/${n.id}`}
                            className="text-xs px-2 py-0.5 rounded-full border border-[#00e05a44] text-[#00a040] hover:bg-[#0f1a12] transition-colors">
                            {n.title}
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-neutral-900 leading-relaxed">{insight.text}</p>
                    {insight.quote && (
                      <blockquote className="mt-2 pl-3 border-l-2 border-[#00e05a33] text-xs text-[#00a040] italic line-clamp-2">
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
    </div>
  )
}
