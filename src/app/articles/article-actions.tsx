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
  const [confirmReprocess, setConfirmReprocess] = useState(false)

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

  const archiveBtn = btn('Archive', 'archive')

  if (status === 'discovered') return (
    <div className="flex items-center gap-1.5 shrink-0">
      {btn('Gather', 'fetch', `/api/articles/${articleId}/fetch`)}
      {archiveBtn}
    </div>
  )

  if (status === 'fetched') return (
    <div className="flex items-center gap-1.5 shrink-0">
      {btn('Analyse', 'process', `/api/articles/${articleId}/process`)}
      {archiveBtn}
    </div>
  )

  if (status === 'processed') return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="flex gap-1.5">
        {confirmReprocess ? (
          <>
            <span className="text-[10px] text-[#007830] self-center">Re-analyse adds insights, keeps existing</span>
            <button
              onClick={() => { setConfirmReprocess(false); runAction('process', `/api/articles/${articleId}/process`) }}
              disabled={loading !== null}
              className="text-xs px-2.5 py-1 rounded border border-amber-700 text-amber-400 bg-amber-950 hover:bg-amber-900 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmReprocess(false)}
              className="text-xs px-2 py-1 text-[#006025] hover:text-[#00a040] transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmReprocess(true)}
            disabled={loading !== null}
            className="text-xs px-2.5 py-1 rounded border border-[#00e05a33] text-[#00a040] hover:bg-[#0f1a12] hover:text-[#00e05a] disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {loading === 'process' ? '…' : 'Re-analyse'}
          </button>
        )}
        {archiveBtn}
      </div>
    </div>
  )

  if (status === 'paywalled' || status === 'failed') return (
    <div className="flex gap-1.5 shrink-0">
      {btn('Re-gather', 'fetch', `/api/articles/${articleId}/fetch`)}
      {archiveBtn}
    </div>
  )

  return null
}
