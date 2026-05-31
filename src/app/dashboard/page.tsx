import { db } from '@/db'
import { articles, insights, sources } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import type { ArticleStatus, InsightStatus, SourceStatus, Perspective, Tier } from '@/lib/types'
import { BulkActions } from './bulk-actions'
import { SourceActions } from './source-actions'
import { AddSourceForm } from './add-source-form'
import { StatusChip } from '@/components/ui/status-chip'
import { PageHeader } from '@/components/ui/page-header'

const TOPIC_ID = 'ai-adoption'

async function getDashboardData() {
  const [articleRows, insightRows, allSources, articlesBySource, analyseRetries] = await Promise.all([
    db.select({ status: articles.status }).from(articles).where(eq(articles.topicId, TOPIC_ID)),
    db.select({ status: insights.status }).from(insights)
      .innerJoin(articles, eq(insights.articleId, articles.id))
      .where(eq(articles.topicId, TOPIC_ID)),
    db.select().from(sources).where(eq(sources.topicId, TOPIC_ID)),
    db.select({
      sourceSlug: articles.sourceSlug,
      status: articles.status,
      count: sql<number>`count(*)::int`,
    }).from(articles).where(eq(articles.topicId, TOPIC_ID)).groupBy(articles.sourceSlug, articles.status),
    db.select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(and(
        eq(articles.topicId, TOPIC_ID),
        eq(articles.status, 'fetched'),
        sql`${articles.data}->>'analyseError' IS NOT NULL`,
      )),
  ])

  const count = (rows: { status: string }[], status: string) =>
    rows.filter(r => r.status === status).length

  const pipeline = {
    discovered: count(articleRows, 'discovered'),
    fetched:    count(articleRows, 'fetched'),
    processed:  count(articleRows, 'processed'),
    archived:   count(articleRows, 'archived'),
    paywalled:  count(articleRows, 'paywalled'),
    failed:     count(articleRows, 'failed'),
    extracted:  count(insightRows, 'extracted'),
    curated:    count(insightRows, 'curated'),
  }

  const sourceStats: Record<string, Record<string, number>> = {}
  for (const row of articlesBySource) {
    if (!sourceStats[row.sourceSlug]) sourceStats[row.sourceSlug] = {}
    sourceStats[row.sourceSlug][row.status] = row.count
  }

  const retryCount = analyseRetries[0]?.count ?? 0

  return { pipeline, sources: allSources, sourceStats, retryCount }
}

function PipelineStep({
  label, count, href, highlight = false,
}: { label: string; count: number; href: string; highlight?: boolean }) {
  return (
    <a href={href} className={`flex-1 rounded-lg border px-4 py-4 text-center transition-colors ${
      highlight
        ? 'border-[#00e05a] bg-[#00e05a] text-[#0a0a0a] hover:bg-[#00f060]'
        : 'border-[#00e05a22] bg-[#0f0f0f] text-[#00e05a] hover:border-[#00e05a66]'
    }`}>
      <p className="text-3xl font-semibold tabular-nums">{count}</p>
      <p className={`text-xs mt-1 uppercase tracking-wide ${highlight ? 'text-[#0a0a0a]' : 'text-[#00a040]'}`}>
        {label}
      </p>
    </a>
  )
}

function Arrow() {
  return <div className="self-center text-[#006025] text-lg shrink-0">→</div>
}

export default async function DashboardPage() {
  const { pipeline, sources: allSources, sourceStats, retryCount } = await getDashboardData()

  const activeSources = allSources.filter(s => s.status === 'active').length
  const totalSources  = allSources.filter(s => s.status !== 'removed').length

  return (
    <div className="max-w-5xl">
      <PageHeader
        crumbs={['Workflow', 'Sources']}
        stats={[
          { n: activeSources, label: 'active', accent: true },
          { n: totalSources,  label: 'total' },
        ]}
        actions={<AddSourceForm topicId={TOPIC_ID} />}
      />

      <div className="px-8 pb-8 space-y-8">

        {/* Pipeline */}
        <section>
          <h2 className="text-[10px] font-semibold text-[#006025] uppercase tracking-widest mb-3">Pipeline</h2>
          <div className="flex items-stretch gap-2">
            <PipelineStep label="Discovered" count={pipeline.discovered} href="/articles?status=discovered" />
            <Arrow />
            <PipelineStep label="Gathered"   count={pipeline.fetched}    href="/articles?status=fetched" />
            <Arrow />
            <PipelineStep label="Analysed"   count={pipeline.processed}  href="/articles?status=processed" />
            <Arrow />
            <PipelineStep label="Insights"   count={pipeline.extracted}  href="/insights?status=extracted" highlight={pipeline.extracted > 0} />
            <Arrow />
            <PipelineStep label="Curated"    count={pipeline.curated}    href="/digest" />
          </div>
          {(pipeline.paywalled > 0 || pipeline.failed > 0) && (
            <div className="flex gap-3 mt-2">
              {pipeline.paywalled > 0 && (
                <a href="/articles?status=paywalled" className="text-xs text-purple-500 hover:underline">
                  {pipeline.paywalled} paywalled
                </a>
              )}
              {pipeline.failed > 0 && (
                <a href="/articles?status=failed" className="text-xs text-red-500 hover:underline">
                  {pipeline.failed} failed
                </a>
              )}
            </div>
          )}
          <div className="mt-3">
            <BulkActions
              topicId={TOPIC_ID}
              discoveredCount={pipeline.discovered}
              gatheredCount={pipeline.fetched}
              retryCount={retryCount}
            />
          </div>
        </section>

        {/* Sources */}
        <section>
          <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] divide-y divide-[#00e05a15]">
            {allSources.filter(s => s.status !== 'removed').map(source => {
              const stats = sourceStats[source.id] ?? {}
              const total = Object.values(stats).reduce((a, b) => a + b, 0)
              const activeStatuses = Object.entries(stats).filter(([, n]) => n > 0)

              return (
                <div key={source.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                          source.status === 'active' ? 'bg-[#00e05a]' : 'bg-amber-400'
                        }`} />
                        <span className="text-sm font-medium truncate">{source.name}</span>
                        <span className="text-xs text-[#007830] capitalize shrink-0">
                          {source.perspective} · T{source.tier}
                        </span>
                      </div>
                      {total > 0 ? (
                        <div className="flex items-center gap-2 mt-1.5 ml-3.5 flex-wrap">
                          {activeStatuses.map(([status, n]) => (
                            <a key={status} href={`/articles?status=${status}`}>
                              <StatusChip status={status} label={`${n} ${status}`} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#006025] mt-1 ml-3.5">No articles yet</p>
                      )}
                    </div>
                    <SourceActions
                      sourceId={source.id}
                      status={source.status as SourceStatus}
                      name={source.name}
                      feedUrl={source.feedUrl}
                      perspective={source.perspective as Perspective}
                      tier={source.tier as Tier}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
