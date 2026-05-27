'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SourceStatus } from '@/lib/types'

export function SourceActions({ sourceId, status }: { sourceId: string; status: SourceStatus }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setStatus(newStatus: SourceStatus) {
    setLoading(true)
    try {
      await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (status === 'removed') return null

  return (
    <div className="flex gap-1.5">
      {status === 'active' && (
        <button
          onClick={() => setStatus('paused')}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
        >
          Pause
        </button>
      )}
      {status === 'paused' && (
        <button
          onClick={() => setStatus('active')}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
        >
          Resume
        </button>
      )}
      <button
        onClick={() => setStatus('removed')}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}
