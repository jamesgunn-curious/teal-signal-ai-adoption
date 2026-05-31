'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Narrative { id: string; title: string }

export function InsightActions({ insightId }: { insightId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showNarratives, setShowNarratives] = useState(false)
  const [narratives, setNarratives] = useState<Narrative[]>([])
  const [addingTo, setAddingTo] = useState<string | null>(null)

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

  async function openNarratives() {
    if (!showNarratives) {
      const res = await fetch('/api/narratives')
      setNarratives(await res.json() as Narrative[])
    }
    setShowNarratives(v => !v)
  }

  async function addToNarrative(narrativeId: string) {
    setAddingTo(narrativeId)
    try {
      await fetch(`/api/narratives/${narrativeId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })
      setShowNarratives(false)
    } finally {
      setAddingTo(null)
    }
  }

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          onClick={() => transition('curate')}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded border border-[#00e05a66] text-[#00e05a] hover:bg-[#0f1a12] disabled:opacity-40 transition-colors"
        >
          {loading === 'curate' ? '…' : 'Review'}
        </button>
        <button
          onClick={() => transition('dismiss')}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded border border-[#00e05a22] text-[#00a040] hover:bg-[#0f1a12] disabled:opacity-40 transition-colors"
        >
          {loading === 'dismiss' ? '…' : 'Dismiss'}
        </button>
        <button
          onClick={openNarratives}
          className="text-xs px-2.5 py-1 rounded border border-[#00e05a22] text-[#006025] hover:text-[#00a040] hover:bg-[#0f1a12] transition-colors"
        >
          + Narrative
        </button>
      </div>

      {showNarratives && (
        <div className="bg-[#0a0a0a] border border-[#00e05a33] rounded-lg shadow-lg py-1 min-w-48 text-xs">
          {narratives.length === 0 ? (
            <div className="px-3 py-2 text-[#006025]">
              No narratives yet —{' '}
              <a href="/narratives" className="underline hover:text-[#00a040]">create one</a>
            </div>
          ) : narratives.map(n => (
            <button
              key={n.id}
              onClick={() => addToNarrative(n.id)}
              disabled={addingTo === n.id}
              className="w-full text-left px-3 py-1.5 text-[#00a040] hover:bg-[#0f1a12] disabled:opacity-40 transition-colors truncate"
            >
              {addingTo === n.id ? '…' : n.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
