'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SourceStatus, Perspective, Tier } from '@/lib/types'
import { EditSourceForm } from './edit-source-form'

const btn = 'text-xs px-2 py-0.5 rounded border disabled:opacity-40 transition-colors'

interface Props {
  sourceId: string
  status: SourceStatus
  name: string
  feedUrl: string
  perspective: Perspective
  tier: Tier
}

export function SourceActions({ sourceId, status, name, feedUrl, perspective, tier }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

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
    <div>
      <div className="flex gap-1.5">
        <button onClick={() => setEditing(e => !e)} disabled={loading}
          className={`${btn} border-[#00e05a22] text-[#006025] hover:bg-[#0f1a12] hover:text-[#00a040]`}>
          Edit
        </button>
        {status === 'active' && (
          <button onClick={() => setStatus('paused')} disabled={loading}
            className={`${btn} border-[#00e05a33] text-[#00a040] hover:bg-[#0f1a12]`}>
            Pause
          </button>
        )}
        {status === 'paused' && (
          <button onClick={() => setStatus('active')} disabled={loading}
            className={`${btn} border-[#00e05a66] text-[#00e05a] hover:bg-[#0f1a12]`}>
            Resume
          </button>
        )}
        <button onClick={() => setStatus('removed')} disabled={loading}
          className={`${btn} border-red-900 text-red-500 hover:bg-red-950`}>
          Remove
        </button>
      </div>
      {editing && (
        <EditSourceForm
          sourceId={sourceId}
          initial={{ name, feedUrl, perspective, tier }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
