'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { InsightActions } from '@/app/insights/insight-actions'
import { INSIGHT_TOKENS } from '@/lib/status-tokens'

interface Props {
  insight: {
    id: string
    text: string
    quote: string
    status: string
    tags: string[]
    perspective: string
    model: string | null
  }
  narratives: { id: string; title: string }[]
}

export function ArticleInsightRow({ insight, narratives }: Props) {
  const router = useRouter()
  const [optimisticStatus, setOptimisticStatus] = useState(insight.status)

  const token = INSIGHT_TOKENS[optimisticStatus as keyof typeof INSIGHT_TOKENS]
  const isReviewed = optimisticStatus === 'curated'
  const isDismissed = optimisticStatus === 'dismissed'

  return (
    <div className={`bg-[#0f0f0f] rounded-lg border px-5 py-4 ${isDismissed ? 'opacity-50 border-[#00e05a11]' : 'border-[#00e05a22]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">

          {/* Status + perspective + model */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${token?.className ?? ''}`}>
              {isReviewed ? 'reviewed' : token?.label ?? optimisticStatus}
            </span>
            <span className="text-xs text-[#007830] capitalize">{insight.perspective}</span>
            {insight.model && (
              <span className="text-[9px] text-[#006025] font-mono">{insight.model}</span>
            )}
          </div>

          {/* Insight text */}
          <p className={`text-sm leading-relaxed mb-2 ${isDismissed ? 'line-through text-[#555]' : 'text-[#00e05a]'}`}>
            {insight.text}
          </p>

          {/* Quote */}
          {insight.quote && (
            <blockquote className="pl-3 border-l-2 border-[#00e05a33] text-xs text-[#00a040] italic mb-2">
              {insight.quote}
            </blockquote>
          )}

          {/* Tags */}
          {insight.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {insight.tags.map(tag => (
                <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#007830] px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Narrative badges */}
          {narratives.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {narratives.map(n => (
                <a
                  key={n.id}
                  href={`/narratives/${n.id}`}
                  className="text-[10px] bg-[#0f1a12] border border-[#00e05a33] text-[#00a040] px-1.5 py-0.5 rounded hover:border-[#00e05a66]"
                >
                  {n.title}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions — only show for non-dismissed */}
        {!isDismissed && (
          <div onClick={() => router.refresh()}>
            <InsightActions insightId={insight.id} />
          </div>
        )}
      </div>
    </div>
  )
}
