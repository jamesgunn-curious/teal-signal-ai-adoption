'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulkResult {
  processed: number
  failed: number
  skipped: number
}

export function BulkActions({ topicId, discoveredCount, gatheredCount, retryCount }: {
  topicId: string
  discoveredCount: number
  gatheredCount: number
  retryCount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'gather' | 'analyse' | null>(null)
  const [result, setResult] = useState<{ action: string } & BulkResult | null>(null)

  async function runBulk(action: 'gather' | 'analyse') {
    setLoading(action)
    setResult(null)
    try {
      const res = await fetch(`/api/topics/${topicId}/bulk-${action}`, { method: 'POST' })
      const data = await res.json() as BulkResult
      setResult({ action, ...data })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const newToAnalyse = gatheredCount - retryCount

  if (discoveredCount === 0 && gatheredCount === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {discoveredCount > 0 && (
        <button
          onClick={() => runBulk('gather')}
          disabled={loading !== null}
          className="px-3 py-1.5 border border-amber-800 text-amber-400 bg-amber-950 text-xs rounded hover:bg-amber-900 disabled:opacity-50 transition-colors"
        >
          {loading === 'gather' ? 'Gathering…' : `Gather ${discoveredCount}`}
        </button>
      )}
      {newToAnalyse > 0 && (
        <button
          onClick={() => runBulk('analyse')}
          disabled={loading !== null}
          className="px-3 py-1.5 border border-[#00e05a66] text-[#00e05a] bg-[#0f1a12] text-xs rounded hover:bg-[#162a1a] disabled:opacity-50 transition-colors"
        >
          {loading === 'analyse' ? 'Analysing…' : `Analyse ${newToAnalyse} new`}
        </button>
      )}
      {retryCount > 0 && (
        <button
          onClick={() => runBulk('analyse')}
          disabled={loading !== null}
          className="px-3 py-1.5 border border-[#00e05a33] text-[#00a040] bg-[#0f1a12] text-xs rounded hover:bg-[#162a1a] disabled:opacity-50 transition-colors"
        >
          {loading === 'analyse' && newToAnalyse === 0 ? 'Retrying…' : `Retry ${retryCount}`}
        </button>
      )}
      {result && (
        <span className="text-xs text-[#00a040]">
          {result.action === 'gather' ? 'Gathered' : 'Analysed'} {result.processed}
          {result.failed > 0 ? ` · ${result.failed} failed` : ''}
          {result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}
        </span>
      )}
    </div>
  )
}
