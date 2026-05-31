'use client'

import { useState } from 'react'
import type { SourceStatus, Perspective, Tier } from '@/lib/types'
import { SourceActions } from '@/app/dashboard/source-actions'
import { AddSourceForm } from '@/app/dashboard/add-source-form'

interface Source {
  id: string
  topicId: string
  name: string
  feedUrl: string
  status: string
  perspective: string
  tier: number | string
}

export function SourcesSection({ sources, topicId }: { sources: Source[]; topicId: string }) {
  const [expanded, setExpanded] = useState(false)

  const visible = sources.filter(s => s.status !== 'removed')
  const activeCount = visible.filter(s => s.status === 'active').length

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22]">
      <div className="flex items-center justify-between px-5 py-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs text-[#007830] hover:text-[#00a040] transition-colors"
        >
          <span className="text-[10px]">{expanded ? '▴' : '▾'}</span>
          <span className="font-medium">Sources</span>
          <span className="text-[#006025] ml-1">{activeCount} active</span>
        </button>
        <AddSourceForm topicId={topicId} />
      </div>

      {expanded && (
        <div className="border-t border-[#00e05a15] divide-y divide-[#00e05a0a]">
          {visible.length === 0 ? (
            <div className="px-5 py-4 text-xs text-[#006025]">No sources yet.</div>
          ) : (
            visible.map(source => (
              <div key={source.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      source.status === 'active' ? 'bg-[#00e05a]' : 'bg-amber-400'
                    }`} />
                    <span className="text-sm font-medium truncate">{source.name}</span>
                    <span className="text-xs text-[#007830] capitalize shrink-0">
                      {source.perspective} · T{source.tier}
                    </span>
                  </div>
                  <SourceActions
                    sourceId={source.id}
                    status={source.status as SourceStatus}
                    name={source.name}
                    feedUrl={source.feedUrl}
                    perspective={source.perspective as Perspective}
                    tier={source.tier as Tier}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
