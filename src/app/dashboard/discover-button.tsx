'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DiscoverResult {
  totalNew: number
  sources: { source: string; new: number; error?: string }[]
}

export function DiscoverButton({ topicId }: { topicId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiscoverResult | null>(null)

  async function handleDiscover() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/topics/${topicId}/gather`, { method: 'POST' })
      const data = await res.json() as DiscoverResult
      setResult(data)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleDiscover}
        disabled={loading}
        className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Discovering…' : 'Discover'}
      </button>
      {result && (
        <p className="text-xs text-neutral-500">
          {result.totalNew > 0 ? (
            <a href="/articles?status=discovered" className="underline hover:text-neutral-700">
              {result.totalNew} new article{result.totalNew !== 1 ? 's' : ''} discovered
            </a>
          ) : 'No new articles'}
        </p>
      )}
    </div>
  )
}
