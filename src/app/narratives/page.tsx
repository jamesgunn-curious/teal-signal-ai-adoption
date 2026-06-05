import { db } from '@/db'
import { narratives, narrativeInsights } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { CreateNarrativeForm } from './create-form'
import Link from 'next/link'

const TOPIC_ID = 'ai-adoption'

const STATUS_STYLE: Record<string, string> = {
  active:  'text-[#00c050]',
  dormant: 'text-[#555]',
  closed:  'text-[#007830]',
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

  const active  = rows.filter(r => r.narrative.status === 'active')
  const dormant = rows.filter(r => r.narrative.status === 'dormant')
  const closed  = rows.filter(r => r.narrative.status === 'closed')

  return (
    <div className="max-w-4xl">
      <div className="px-8 pt-8 pb-4">
        <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-4">
              {[
                { n: active.length,  label: 'active',  accent: active.length > 0 },
                { n: dormant.length, label: 'dormant' },
                { n: closed.length,  label: 'closed'  },
              ].map(({ n, label, accent }) => (
                <div key={label} className="flex items-baseline gap-1">
                  <span className={`text-lg font-semibold tabular-nums leading-none ${accent ? 'text-[#00e05a]' : 'text-[#007830]'}`}>{n}</span>
                  <span className="text-[10px] text-[#006025] uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
            <CreateNarrativeForm />
          </div>
        </div>
      </div>

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

            {dormant.length > 0 && (
              <section>
                <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-2">Dormant</h2>
                <div className="space-y-2 opacity-50">
                  {dormant.map(({ narrative, insightCount }) => (
                    <NarrativeRow key={narrative.id} narrative={narrative} insightCount={insightCount} />
                  ))}
                </div>
              </section>
            )}
            {closed.length > 0 && (
              <section>
                <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-2">Closed</h2>
                <div className="space-y-2 opacity-30">
                  {closed.map(({ narrative, insightCount }) => (
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
