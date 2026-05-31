import { db } from '@/db'
import { narratives, narrativeInsights } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { PageHeader } from '@/components/ui/page-header'
import { CreateNarrativeForm } from './create-form'
import Link from 'next/link'

const TOPIC_ID = 'ai-adoption'

const STATUS_STYLE: Record<string, string> = {
  active:   'text-[#00c050]',
  archived: 'text-[#555]',
  resolved: 'text-[#007830]',
}

export default async function NarrativesPage() {
  const rows = await db
    .select({
      narrative: narratives,
      insightCount: sql<number>`count(${narrativeInsights.id})::int`,
    })
    .from(narratives)
    .leftJoin(narrativeInsights, eq(narrativeInsights.narrativeId, narratives.id))
    .where(eq(narratives.topicId, TOPIC_ID))
    .groupBy(narratives.id)

  const active   = rows.filter(r => r.narrative.status === 'active')
  const archived = rows.filter(r => r.narrative.status !== 'active')

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Output', 'Narratives']}
        stats={[
          { n: active.length,   label: 'active',   accent: active.length > 0 },
          { n: archived.length, label: 'archived' },
        ]}
        actions={<CreateNarrativeForm />}
      />

      <div className="px-8 pb-8 space-y-6">

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#006025] mb-1">No narratives yet.</p>
            <p className="text-xs text-[#006025]">
              Create a narrative to track a theme across gather runs — add insights, evolve the statement, split or converge threads over time.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <div className="space-y-2">
                  {active.map(({ narrative, insightCount }) => (
                    <NarrativeRow key={narrative.id} narrative={narrative} insightCount={insightCount} />
                  ))}
                </div>
              </section>
            )}

            {archived.length > 0 && (
              <section>
                <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-2">Archived</h2>
                <div className="space-y-2 opacity-50">
                  {archived.map(({ narrative, insightCount }) => (
                    <NarrativeRow key={narrative.id} narrative={narrative} insightCount={insightCount} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NarrativeRow({ narrative, insightCount }: {
  narrative: typeof narratives.$inferSelect
  insightCount: number
}) {
  return (
    <Link href={`/narratives/${narrative.id}`}
      className="block bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4 hover:border-[#00e05a44] transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[narrative.status]}`}>
              {narrative.status}
            </span>
          </div>
          <p className="text-sm font-medium text-[#00e05a] group-hover:text-[#00f060] transition-colors leading-snug">
            {narrative.title}
          </p>
          {narrative.description && (
            <p className="text-xs text-[#006025] mt-1 line-clamp-2">{narrative.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-[#007830] tabular-nums">{insightCount}</div>
          <div className="text-[9px] text-[#006025] uppercase tracking-wide">insights</div>
        </div>
      </div>
    </Link>
  )
}
