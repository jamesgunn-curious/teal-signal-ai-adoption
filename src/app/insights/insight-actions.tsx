'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InsightActions({ insightId }: { insightId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(action: string) {
    setLoading(action)
    try {
      await fetch(`/api/insights/${insightId}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={() => transition('curate')}
        disabled={loading !== null}
        className="text-xs px-2.5 py-1 rounded border border-[#00e05a66] text-[#00e05a] hover:bg-[#0f1a12] disabled:opacity-40 transition-colors"
      >
        {loading === 'curate' ? '…' : 'Curate'}
      </button>
      <button
        onClick={() => transition('dismiss')}
        disabled={loading !== null}
        className="text-xs px-2.5 py-1 rounded border border-[#00e05a22] text-[#00a040] hover:bg-[#0f1a12] disabled:opacity-40 transition-colors"
      >
        {loading === 'dismiss' ? '…' : 'Dismiss'}
      </button>
    </div>
  )
}
