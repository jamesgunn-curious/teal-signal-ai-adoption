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

export function SourcesSection({ sources, topicId, activeSourceFilter, onSourceFilter }: {
  sources: Source[]
  topicId: string
  activeSourceFilter?: string | null
  onSourceFilter?: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const visible = sources.filter(s => s.status !== 'removed')
  const activeCount = visible.filter(s => s.status === 'active').length
  const filteredSourceName = activeSourceFilter
    ? visible.find(s => s.id === activeSourceFilter)?.name ?? activeSourceFilter
    : null

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22]">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-[#007830] hover:text-[#00a040] transition-colors shrink-0"
          >
            <span className="text-[10px]">{expanded ? '▴' : '▾'}</span>
            <span className="font-medium">Sources</span>
            <span className="text-[#006025] ml-1">{activeCount} active</span>
          </button>
          {filteredSourceName && (
            <button
              onClick={() => onSourceFilter?.(null)}
              className="flex items-center gap-1 text-[10px] text-[#00e05a] hover:text-[#00f060] bg-[#0f1a12] border border-[#00e05a33] px-2 py-0.5 rounded-full transition-colors"
              title="Clear source filter"
            >
              <span>{filteredSourceName}</span>
              <span className="text-[#006025]">✕</span>
            </button>
          )}
        </div>
        <AddSourceForm topicId={topicId} />
      </div>

      {expanded && (
        <div className="border-t border-[#00e05a15] divide-y divide-[#00e05a0a]">
          {visible.length === 0 ? (
            <div className="px-5 py-4 text-xs text-[#006025]">No sources yet.</div>
          ) : (
            visible.map(source => {
              const isFiltered = activeSourceFilter === source.id
              return (
                <div key={source.id} className={`px-4 py-3 ${isFiltered ? 'bg-[#0f1a12]' : ''}`}>
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => onSourceFilter?.(isFiltered ? null : source.id)}
                      className="flex items-center gap-2 min-w-0 text-left group"
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                        source.status === 'active' ? 'bg-[#00e05a]' : 'bg-amber-400'
                      }`} />
                      <span className={`text-sm font-medium truncate transition-colors ${
                        isFiltered ? 'text-[#00e05a]' : 'text-[#00c050] group-hover:text-[#00e05a]'
                      }`}>
                        {source.name}
                      </span>
                      <span className="text-xs text-[#007830] capitalize shrink-0">
                        {source.perspective} · T{source.tier}
                      </span>
                    </button>
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
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
