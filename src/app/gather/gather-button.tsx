'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GatherResult {
  totalNew: number
  sources: { source: string; new: number; error?: string }[]
}

export function GatherButton({ topicId }: { topicId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GatherResult | null>(null)

  async function handleGather() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/topics/${topicId}/gather`, { method: 'POST' })
      const data = await res.json() as GatherResult
      setResult(data)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGather}
        disabled={loading}
        className="px-4 py-2 bg-[#00e05a] text-[#0a0a0a] text-sm font-medium rounded hover:bg-[#00f060] disabled:opacity-50 transition-colors"
      >
        {loading ? 'Discovering…' : '↻ Discover'}
      </button>
      {result && (
        <p className="text-xs text-[#00a040]">
          {result.totalNew > 0 ? (
            <a href="/articles?status=discovered" className="underline hover:text-[#00e05a]">
              {result.totalNew} new article{result.totalNew !== 1 ? 's' : ''} discovered →
            </a>
          ) : 'No new articles found'}
        </p>
      )}
    </div>
  )
}
