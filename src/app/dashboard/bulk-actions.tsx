'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulkResult {
  processed: number
  failed: number
  skipped: number
}

export function BulkActions({ topicId, discoveredCount, gatheredCount }: {
  topicId: string
  discoveredCount: number
  gatheredCount: number
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

  if (discoveredCount === 0 && gatheredCount === 0) return null

  return (
    <div className="flex items-center gap-2">
      {discoveredCount > 0 && (
        <button
          onClick={() => runBulk('gather')}
          disabled={loading !== null}
          className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'gather' ? 'Gathering…' : `Gather all ${discoveredCount}`}
        </button>
      )}
      {gatheredCount > 0 && (
        <button
          onClick={() => runBulk('analyse')}
          disabled={loading !== null}
          className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'analyse' ? 'Analysing…' : `Analyse all ${gatheredCount}`}
        </button>
      )}
      {result && (
        <span className="text-xs text-neutral-500">
          {result.action === 'gather' ? 'Gathered' : 'Analysed'} {result.processed}
          {result.failed > 0 ? `, ${result.failed} failed` : ''}
        </span>
      )}
    </div>
  )
}
