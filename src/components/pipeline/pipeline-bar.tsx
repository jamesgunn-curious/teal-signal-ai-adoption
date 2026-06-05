'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface PipelineBarProps {
  topicId: string
  discovered: number
  fetchedArticleIds: string[]
  processed: number
  activeSources: number
  lastRun: string | null
  lookbackDays: number
}

type LoadingState = 'discover' | 'gather' | 'analyse' | null

export function PipelineBar({
  topicId, discovered, fetchedArticleIds, processed, activeSources, lastRun, lookbackDays,
}: PipelineBarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<LoadingState>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number; failed: number } | null>(null)
  const [editingLookback, setEditingLookback] = useState(false)
  const [lookbackInput, setLookbackInput] = useState(String(lookbackDays))
  const lookbackRef = useRef<HTMLInputElement>(null)

  const fetched = fetchedArticleIds.length

  async function runDiscover(force = false) {
    setLoading('discover')
    setFeedback(null)
    try {
      const url = `/api/topics/${topicId}/gather${force ? '?force=true' : ''}`
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json() as { totalNew: number; sources: { source: string; new: number; error?: string }[] }
      const n = data.totalNew ?? 0
      const withNew = (data.sources ?? []).filter(s => s.new > 0)
      const withError = (data.sources ?? []).filter(s => s.error)
      const label = force ? '· force' : ''
      if (n === 0 && withError.length === 0) {
        setFeedback(`No new articles${label}`)
      } else {
        const parts = withNew.map(s => `${s.source} +${s.new}`)
        const errParts = withError.map(s => `${s.source} error`)
        setFeedback([...parts, ...errParts].join(' · ') + (label ? ` ${label}` : ''))
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function runGather() {
    setLoading('gather')
    setFeedback(null)
    try {
      const res = await fetch(`/api/topics/${topicId}/bulk-gather`, { method: 'POST' })
      const data = await res.json() as Record<string, unknown>
      const p = (data.processed as number) ?? 0
      const f = (data.failed as number) ?? 0
      setFeedback(`Gathered ${p}${f > 0 ? ` · ${f} failed` : ''}`)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function runAnalyseQueue() {
    if (fetchedArticleIds.length === 0) return
    setLoading('analyse')
    setFeedback(null)
    const progress = { current: 0, total: fetchedArticleIds.length, failed: 0 }
    setQueueProgress({ ...progress })

    for (const id of fetchedArticleIds) {
      progress.current++
      setQueueProgress({ ...progress })
      try {
        const res = await fetch(`/api/articles/${id}/process`, { method: 'POST' })
        if (!res.ok) progress.failed++
      } catch {
        progress.failed++
      }
    }

    const succeeded = progress.total - progress.failed
    setFeedback(`Analysed ${succeeded}${progress.failed > 0 ? ` · ${progress.failed} failed` : ''}`)
    setQueueProgress(null)
    setLoading(null)
    router.refresh()
  }

  async function saveLookback() {
    const days = parseInt(lookbackInput, 10)
    if (!isNaN(days) && days > 0 && days !== lookbackDays) {
      await fetch(`/api/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackDays: days }),
      })
      router.refresh()
    } else {
      setLookbackInput(String(lookbackDays))
    }
    setEditingLookback(false)
  }

  const lastRunLabel = lastRun
    ? new Date(lastRun).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
    : '—'

  const busy = loading !== null

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
      <div className="flex items-center gap-3 flex-wrap">

        {/* Step 1 — Discover */}
        <div className="flex items-center gap-2">
          <div className="flex items-stretch">
            <button
              onClick={() => runDiscover(false)}
              disabled={busy}
              className="px-3 py-1.5 bg-[#00e05a] text-[#0a0a0a] text-xs font-semibold rounded-l hover:bg-[#00f060] disabled:opacity-50 transition-colors"
            >
              {loading === 'discover' ? 'Discovering…' : `↻ Discover · ${lookbackDays}d`}
            </button>
            <button
              onClick={() => runDiscover(true)}
              disabled={busy}
              title={`Force rescan all sources · ${lookbackDays}d window`}
              className="px-2 py-1.5 bg-[#00c04a] text-[#0a0a0a] text-[10px] font-semibold rounded-r border-l border-[#009038] hover:bg-[#00e05a] disabled:opacity-50 transition-colors"
            >
              ⟳
            </button>
          </div>
          <span className="text-xs text-[#007830] tabular-nums">{discovered} discovered</span>
        </div>

        <span className="text-[#006025]">→</span>

        {/* Step 2 — Gather */}
        <div className="flex items-center gap-2">
          {discovered > 0 ? (
            <button
              onClick={runGather}
              disabled={busy}
              className="px-3 py-1.5 border border-amber-800 text-amber-400 bg-amber-950 text-xs font-semibold rounded hover:bg-amber-900 disabled:opacity-50 transition-colors"
            >
              {loading === 'gather' ? 'Gathering…' : `Gather ${discovered} →`}
            </button>
          ) : (
            <span className="px-3 py-1.5 text-xs text-[#006025]">Gather</span>
          )}
          <span className="text-xs text-[#007830] tabular-nums">{fetched} gathered</span>
        </div>

        <span className="text-[#006025]">→</span>

        {/* Step 3 — Analyse (sequential queue) */}
        <div className="flex items-center gap-2">
          {fetched > 0 ? (
            <button
              onClick={runAnalyseQueue}
              disabled={busy}
              className="px-3 py-1.5 border border-[#00e05a66] text-[#00e05a] bg-[#0f1a12] text-xs font-semibold rounded hover:bg-[#162a1a] disabled:opacity-50 transition-colors"
            >
              {loading === 'analyse' ? 'Analysing…' : `Analyse ${fetched} →`}
            </button>
          ) : (
            <span className="px-3 py-1.5 text-xs text-[#006025]">Analyse</span>
          )}
          <span className="text-xs text-[#007830] tabular-nums">{processed} analysed</span>
        </div>

      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#00e05a15] flex-wrap">
        <span className="text-xs text-[#006025]">{activeSources} active feeds</span>
        <span className="text-xs text-[#006025]">·</span>
        {editingLookback ? (
          <span className="flex items-center gap-1">
            <input
              ref={lookbackRef}
              type="number"
              min={1}
              max={365}
              value={lookbackInput}
              onChange={e => setLookbackInput(e.target.value)}
              onBlur={saveLookback}
              onKeyDown={e => {
                if (e.key === 'Enter') lookbackRef.current?.blur()
                if (e.key === 'Escape') { setLookbackInput(String(lookbackDays)); setEditingLookback(false) }
              }}
              className="w-12 text-xs bg-transparent border-b border-[#00e05a44] text-[#00a040] text-center outline-none"
              autoFocus
            />
            <span className="text-xs text-[#006025]">d lookback</span>
          </span>
        ) : (
          <button
            onClick={() => { setEditingLookback(true); setLookbackInput(String(lookbackDays)) }}
            className="text-xs text-[#006025] hover:text-[#00a040] transition-colors"
            title="Click to edit lookback window"
          >
            {lookbackDays}d lookback
          </button>
        )}
        <span className="text-xs text-[#006025]">·</span>
        <span className="text-xs text-[#006025]">last run: {lastRunLabel}</span>
        {feedback && (
          <>
            <span className="text-xs text-[#006025]">·</span>
            <span className="text-xs text-[#00a040]">{feedback}</span>
          </>
        )}
      </div>
    </div>
  )
}
