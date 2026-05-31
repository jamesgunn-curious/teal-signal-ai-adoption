import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PageHeader } from '@/components/ui/page-header'
import { GatherButton } from './gather-button'

const TOPIC_ID = 'ai-adoption'

export default async function GatherPage() {
  const allSources = await db
    .select()
    .from(sources)
    .where(eq(sources.topicId, TOPIC_ID))

  const active = allSources.filter(s => s.status === 'active')
  const paused = allSources.filter(s => s.status === 'paused')

  return (
    <div className="max-w-3xl">
      <PageHeader
        crumbs={['Workflow', 'Discover']}
        stats={[
          { n: active.length, label: 'active feeds', accent: true },
          { n: 14,            label: 'day lookback' },
        ]}
        actions={<GatherButton topicId={TOPIC_ID} />}
      />

      <div className="px-8 pb-8 space-y-6">

        {/* Active sources */}
        <section>
          <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-3">
            Active feeds
          </h2>
          <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] divide-y divide-[#00e05a15]">
            {active.map(source => (
              <div key={source.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00e05a] shrink-0" />
                  <span className="text-sm font-medium truncate">{source.name}</span>
                  <span className="text-xs text-[#007830] capitalize shrink-0">{source.perspective} · T{source.tier}</span>
                </div>
                <span className="text-[10px] text-[#006025] font-mono truncate max-w-48 shrink-0">{source.feedUrl}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Paused sources */}
        {paused.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-3">
              Paused — excluded from gather
            </h2>
            <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a11] divide-y divide-[#00e05a0a] opacity-50">
              {paused.map(source => (
                <div key={source.id} className="px-4 py-2.5 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-[#006025] truncate">{source.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-[#006025]">
          Discover scans RSS feeds for new articles within the lookback window.
          To gather content and analyse, go to{' '}
          <a href="/articles" className="underline hover:text-[#00a040]">Article queue →</a>
        </p>

      </div>
    </div>
  )
}
