'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ArticleStatus, ArticleData } from '@/lib/types'
import { StatusChip } from '@/components/ui/status-chip'
import { ArticleActions } from '@/app/articles/article-actions'
import { ARTICLE_TOKENS } from '@/lib/status-tokens'

function FailBadge({ count, errors, label }: { count: number; errors: string[]; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="inline-flex flex-col">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[10px] text-amber-600 hover:text-amber-400 transition-colors text-left"
      >
        {label} failed {count}× {open ? '▴' : '▾'}
      </button>
      {open && (
        <span className="mt-1 space-y-1">
          {errors.map((e, i) => (
            <span key={i} className="block text-[10px] text-[#555] font-mono leading-relaxed">
              {i + 1}. {e.length > 120 ? e.slice(0, 120) + '…' : e}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

// Display order: active pipeline stages first, then terminal states
const STATUS_ORDER: ArticleStatus[] = ['discovered', 'fetched', 'paywalled', 'failed', 'processed', 'archived']

interface ArticleRow {
  id: string
  status: string
  publishedDate: string
  url: string
  sourceSlug: string
  data: unknown
  wordCount: number | null
  analyseDurationMs: number | null
}

type BulkOp = 'gather' | 'regather' | 'analyse' | 'archive'

export function ArticleQueue({ articles, insightCountMap, sourceFilter = null }: {
  articles: ArticleRow[]
  insightCountMap: Record<string, number>
  sourceFilter?: string | null
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOp, setBulkOp] = useState<BulkOp | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; failed: number } | null>(null)

  const visibleArticles = sourceFilter ? articles.filter(a => a.sourceSlug === sourceFilter) : articles

  const counts = Object.fromEntries(
    STATUS_ORDER.map(s => [s, visibleArticles.filter(a => a.status === s).length])
  )

  const filtered = filter ? visibleArticles.filter(a => a.status === filter) : visibleArticles

  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status as ArticleStatus)
    const bi = STATUS_ORDER.indexOf(b.status as ArticleStatus)
    return ai !== bi ? ai - bi : new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(sorted.map(a => a.id)))
  }

  function clearSelection() {
    setSelected(new Set())
    setBulkProgress(null)
  }

  async function runBulk(op: BulkOp) {
    const targets = sorted.filter(a => {
      if (!selected.has(a.id)) return false
      if (op === 'gather')   return a.status === 'discovered'
      if (op === 'regather') return a.status === 'paywalled' || a.status === 'failed'
      if (op === 'analyse')  return a.status === 'fetched'
      return true // archive — all
    })
    if (targets.length === 0) return

    setBulkOp(op)
    const progress = { current: 0, total: targets.length, failed: 0 }
    setBulkProgress({ ...progress })

    for (const article of targets) {
      progress.current++
      setBulkProgress({ ...progress })
      try {
        if (op === 'gather' || op === 'regather') {
          await fetch(`/api/articles/${article.id}/fetch`, { method: 'POST' })
        } else if (op === 'analyse') {
          const res = await fetch(`/api/articles/${article.id}/process`, { method: 'POST' })
          if (!res.ok) progress.failed++
        } else {
          await fetch(`/api/articles/${article.id}/transition`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'archive' }),
          })
        }
      } catch {
        progress.failed++
      }
    }

    setBulkOp(null)
    setBulkProgress(null)
    setSelected(new Set())
    router.refresh()
  }

  const selArray = sorted.filter(a => selected.has(a.id))
  const canGather   = selArray.some(a => a.status === 'discovered')
  const canRegather = selArray.some(a => a.status === 'paywalled' || a.status === 'failed')
  const canAnalyse  = selArray.some(a => a.status === 'fetched')
  const busy = bulkOp !== null

  return (
    <div>
      {/* Filter pills row — Select all / Clear always visible far-right */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !filter
                ? 'bg-[#00e05a] text-[#0a0a0a]'
                : 'bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] hover:border-[#00e05a44]'
            }`}
          >
            All <span className="opacity-70">{visibleArticles.length}</span>
          </button>
          {STATUS_ORDER.map(s => {
            const n = counts[s]
            return (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? null : s)}
                disabled={n === 0}
                className={`transition-opacity disabled:opacity-30 ${
                  filter === s ? 'opacity-100 filter-pill-active' : 'opacity-60 hover:opacity-90'
                }`}
              >
                <StatusChip status={s} label={`${ARTICLE_TOKENS[s]?.label ?? s} ${n}`} />
              </button>
            )
          })}
        </div>
        {/* Select all / Clear — always visible */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={selectAll} className="text-[10px] text-[#006025] hover:text-[#00a040] transition-colors whitespace-nowrap">
            Select all {sorted.length}
          </button>
          <button onClick={clearSelection} className="text-[10px] text-[#555] hover:text-[#777] transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Bulk actions — right-aligned, visible when items are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
          <span className="text-xs text-[#007830] tabular-nums mr-1">{selected.size} selected</span>
          {canGather && (
            <button onClick={() => runBulk('gather')} disabled={busy}
              className="text-xs px-2.5 py-1 rounded border border-amber-700 text-amber-400 bg-amber-950 hover:bg-amber-900 disabled:opacity-50 transition-colors whitespace-nowrap">
              {bulkOp === 'gather' && bulkProgress ? `Gathering ${bulkProgress.current}/${bulkProgress.total}` : 'Gather'}
            </button>
          )}
          {canRegather && (
            <button onClick={() => runBulk('regather')} disabled={busy}
              className="text-xs px-2.5 py-1 rounded border border-amber-700 text-amber-400 bg-amber-950 hover:bg-amber-900 disabled:opacity-50 transition-colors whitespace-nowrap">
              {bulkOp === 'regather' && bulkProgress ? `Re-gathering ${bulkProgress.current}/${bulkProgress.total}` : 'Re-gather'}
            </button>
          )}
          {canAnalyse && (
            <button onClick={() => runBulk('analyse')} disabled={busy}
              className="text-xs px-2.5 py-1 rounded border border-[#00e05a44] text-[#00e05a] bg-[#0f1a12] hover:bg-[#162a1a] disabled:opacity-50 transition-colors whitespace-nowrap">
              {bulkOp === 'analyse' && bulkProgress ? `Analysing ${bulkProgress.current}/${bulkProgress.total}${bulkProgress.failed > 0 ? ` · ${bulkProgress.failed} failed` : ''}` : 'Analyse'}
            </button>
          )}
          <button onClick={() => runBulk('archive')} disabled={busy}
            className="text-xs px-2.5 py-1 rounded border border-[#00e05a22] text-[#00a040] hover:bg-[#0f1a12] disabled:opacity-50 transition-colors whitespace-nowrap">
            {bulkOp === 'archive' && bulkProgress ? `Archiving ${bulkProgress.current}/${bulkProgress.total}` : 'Archive'}
          </button>
        </div>
      )}

      {/* Article list */}
      {sorted.length === 0 ? (
        <p className="text-sm text-[#006025] py-4">
          {filter ? 'No articles with this status.' : 'No articles. Run Discover to find new articles.'}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map(article => {
            const data = article.data as ArticleData
            const insightCount = insightCountMap[article.id] ?? 0
            const isSelected = selected.has(article.id)
            return (
              <div key={article.id} className={`bg-[#0f0f0f] rounded-lg border px-4 py-3 transition-colors ${isSelected ? 'border-[#00e05a44] bg-[#0f1a12]' : 'border-[#00e05a22]'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(article.id)}
                    className="mt-1 shrink-0 accent-[#00e05a] cursor-pointer"
                  />
                  <div className="flex items-start justify-between gap-4 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusChip status={article.status} />
                      <span className="text-xs text-[#007830] capitalize">{data.perspective} · Tier {data.tier}</span>
                      <span className="text-xs text-[#006025]">{article.publishedDate}</span>
                      {article.wordCount != null && (
                        <span className="text-xs text-[#006025]">
                          {article.wordCount.toLocaleString()} words{data.accessLevel ? ` · ${data.accessLevel}` : ''}{article.analyseDurationMs != null ? ` · ${Math.round(article.analyseDurationMs / 1000)}s` : ''}
                        </span>
                      )}
                      {insightCount > 0 && (
                        <span className="text-xs text-[#006025]">
                          {insightCount} insight{insightCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Link
                        href={`/articles/${article.id}`}
                        className="text-sm font-medium text-[#00e05a] hover:text-[#00f060] transition-colors line-clamp-2"
                      >
                        {data.title}
                      </Link>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-[#006025] hover:text-[#00a040] mt-0.5"
                        title="Open original article"
                      >
                        ↗
                      </a>
                    </div>
                    {data.executiveSummary && (
                      <p className="text-xs text-[#006025] mt-1 line-clamp-2">{data.executiveSummary}</p>
                    )}
                    {data.gatherFailCount && article.status === 'discovered' ? (
                      <div className="mt-1">
                        <FailBadge
                          count={data.gatherFailCount}
                          errors={data.gatherErrors ?? [data.fetchError ?? 'unknown error']}
                          label="Gather"
                        />
                      </div>
                    ) : null}
                    {data.analyseFailCount && article.status === 'fetched' ? (
                      <div className="mt-1">
                        <FailBadge
                          count={data.analyseFailCount}
                          errors={data.analyseErrors ?? [data.analyseError ?? 'unknown error']}
                          label="Analysis"
                        />
                      </div>
                    ) : null}
                    {data.tags && data.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {data.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArticleActions articleId={article.id} status={article.status as ArticleStatus} />
                </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
