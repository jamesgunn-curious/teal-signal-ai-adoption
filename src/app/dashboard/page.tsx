import { db } from '@/db'
import { articles, insights, sources } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { ArticleStatus, InsightStatus, SourceStatus } from '@/lib/types'
import { DiscoverButton } from './discover-button'
import { BulkActions } from './bulk-actions'
import { SourceActions } from './source-actions'
import { AddSourceForm } from './add-source-form'

const TOPIC_ID = 'ai-adoption'

const STATUS_LABELS: Record<string, string> = {
  discovered: 'Discovered',
  fetched:    'Gathered',
  processed:  'Analysed',
  archived:   'Archived',
  paywalled:  'Paywalled',
  failed:     'Failed',
}

async function getDashboardData() {
  const [articleRows, insightRows, allSources, articlesBySource] = await Promise.all([
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

  return { pipeline, sources: allSources, sourceStats }
}

function PipelineStep({
  label, count, href, highlight = false,
}: { label: string; count: number; href: string; highlight?: boolean }) {
  return (
    <a href={href} className={`flex-1 rounded-lg border px-4 py-4 text-center transition-colors hover:border-neutral-400 ${
      highlight ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-900'
    }`}>
      <p className={`text-3xl font-semibold tabular-nums ${highlight ? 'text-white' : 'text-neutral-900'}`}>
        {count}
      </p>
      <p className={`text-xs mt-1 uppercase tracking-wide ${highlight ? 'text-neutral-300' : 'text-neutral-500'}`}>
        {label}
      </p>
    </a>
  )
}

function Arrow() {
  return <div className="self-center text-neutral-300 text-lg shrink-0">→</div>
}

const STATUS_COLOURS: Record<string, string> = {
  discovered: 'bg-blue-50 text-blue-700',
  fetched:    'bg-amber-50 text-amber-700',
  processed:  'bg-green-50 text-green-700',
  archived:   'bg-neutral-100 text-neutral-500',
  paywalled:  'bg-purple-50 text-purple-700',
  failed:     'bg-red-50 text-red-700',
}

export default async function DashboardPage() {
  const { pipeline, sources: allSources, sourceStats } = await getDashboardData()
  const totalArticles = pipeline.discovered + pipeline.fetched + pipeline.processed + pipeline.archived + pipeline.paywalled + pipeline.failed

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-wide">AI Adoption</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {totalArticles > 0
              ? `${totalArticles} articles · ${pipeline.curated} insights curated`
              : 'No articles yet — click Discover to start'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DiscoverButton topicId={TOPIC_ID} />
          <BulkActions
            topicId={TOPIC_ID}
            discoveredCount={pipeline.discovered}
            gatheredCount={pipeline.fetched}
          />
        </div>
      </div>

      {/* Pipeline */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Pipeline</h2>
        <div className="flex items-stretch gap-2">
          <PipelineStep label="Discovered" count={pipeline.discovered} href="/articles?status=discovered" />
          <Arrow />
          <PipelineStep label="Gathered" count={pipeline.fetched} href="/articles?status=fetched" />
          <Arrow />
          <PipelineStep label="Analysed" count={pipeline.processed} href="/articles?status=processed" />
          <Arrow />
          <PipelineStep label="Insights" count={pipeline.extracted} href="/insights?status=extracted" highlight={pipeline.extracted > 0} />
          <Arrow />
          <PipelineStep label="Curated" count={pipeline.curated} href="/digest" />
        </div>
        {(pipeline.paywalled > 0 || pipeline.failed > 0) && (
          <div className="flex gap-3 mt-2">
            {pipeline.paywalled > 0 && (
              <a href="/articles?status=paywalled" className="text-xs text-purple-600 hover:underline">
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
      </section>

      {/* Sources */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Sources
          </h2>
          <AddSourceForm topicId={TOPIC_ID} />
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100">
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
                        source.status === 'active' ? 'bg-green-500' : 'bg-amber-400'
                      }`} />
                      <span className="text-sm font-medium truncate">{source.name}</span>
                      <span className="text-xs text-neutral-400 capitalize shrink-0">
                        {source.perspective} · T{source.tier}
                      </span>
                    </div>
                    {total > 0 ? (
                      <div className="flex items-center gap-2 mt-1.5 ml-3.5 flex-wrap">
                        {activeStatuses.map(([status, n]) => (
                          <a
                            key={status}
                            href={`/articles?status=${status}`}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOURS[status] ?? 'bg-neutral-100 text-neutral-500'}`}
                          >
                            {n} {STATUS_LABELS[status] ?? status}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-300 mt-1 ml-3.5">No articles yet</p>
                    )}
                  </div>
                  <SourceActions sourceId={source.id} status={source.status as SourceStatus} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
