'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArticleStatus } from '@/lib/types'

interface Props {
  articleId: string
  status: ArticleStatus
}

export function ArticleActions({ articleId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function runAction(action: string, endpoint?: string) {
    setLoading(action)
    try {
      if (endpoint) {
        await fetch(endpoint, { method: 'POST' })
      } else {
        await fetch(`/api/articles/${articleId}/transition`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const btn = (label: string, action: string, endpoint?: string) => (
    <button
      key={action}
      onClick={() => runAction(action, endpoint)}
      disabled={loading !== null}
      className="text-xs px-2.5 py-1 rounded border border-[#00e05a33] text-[#00a040] hover:bg-[#0f1a12] hover:text-[#00e05a] disabled:opacity-40 transition-colors whitespace-nowrap"
    >
      {loading === action ? '…' : label}
    </button>
  )

  if (status === 'discovered') return (
    <div className="flex gap-1.5 shrink-0">
      {btn('Gather', 'fetch', `/api/articles/${articleId}/fetch`)}
      {btn('Paywalled', 'markPaywalled')}
      {btn('Failed', 'markFailed')}
    </div>
  )

  if (status === 'fetched') return (
    <div className="flex gap-1.5 shrink-0">
      {btn('Analyse', 'process', `/api/articles/${articleId}/process`)}
      {btn('Paywalled', 'markPaywalled')}
      {btn('Failed', 'markFailed')}
    </div>
  )

  if (status === 'processed') return (
    <div className="flex gap-1.5 shrink-0">
      {btn('Archive', 'archive')}
    </div>
  )

  return null
}
