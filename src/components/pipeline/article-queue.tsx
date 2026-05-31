'use client'

import { useState } from 'react'
import type { ArticleStatus, ArticleData } from '@/lib/types'
import { StatusChip } from '@/components/ui/status-chip'
import { ArticleActions } from '@/app/articles/article-actions'
import { ARTICLE_TOKENS } from '@/lib/status-tokens'

const STATUS_ORDER: ArticleStatus[] = ['discovered', 'fetched', 'processed', 'archived', 'paywalled', 'failed']

interface ArticleRow {
  id: string
  status: string
  publishedDate: string
  url: string
  sourceSlug: string
  data: unknown
  wordCount: number | null
  analyseDurationMs: number | null
}

export function ArticleQueue({ articles, insightCountMap }: {
  articles: ArticleRow[]
  insightCountMap: Record<string, number>
}) {
  const [filter, setFilter] = useState<string | null>(null)

  const counts = Object.fromEntries(
    STATUS_ORDER.map(s => [s, articles.filter(a => a.status === s).length])
  )

  const filtered = filter ? articles.filter(a => a.status === filter) : articles

  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status as ArticleStatus)
    const bi = STATUS_ORDER.indexOf(b.status as ArticleStatus)
    return ai !== bi ? ai - bi : new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  })

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !filter
              ? 'bg-[#00e05a] text-[#0a0a0a]'
              : 'bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] hover:border-[#00e05a44]'
          }`}
        >
          All <span className="opacity-70">{articles.length}</span>
        </button>
        {STATUS_ORDER.map(s => {
          const n = counts[s]
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? null : s)}
              disabled={n === 0}
              className={`transition-opacity disabled:opacity-30 ${
                filter === s ? 'opacity-100 ring-1 ring-white/20 rounded-full' : 'opacity-60 hover:opacity-90'
              }`}
            >
              <StatusChip status={s} label={`${ARTICLE_TOKENS[s]?.label ?? s} ${n}`} />
            </button>
          )
        })}
      </div>

      {/* Article list */}
      {sorted.length === 0 ? (
        <p className="text-sm text-[#006025] py-4">
          {filter ? 'No articles with this status.' : 'No articles. Run Discover to find new articles.'}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map(article => {
            const data = article.data as ArticleData
            const insightCount = insightCountMap[article.id] ?? 0
            return (
              <div key={article.id} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusChip status={article.status} />
                      <span className="text-xs text-[#007830] capitalize">{data.perspective} · Tier {data.tier}</span>
                      <span className="text-xs text-[#006025]">{article.publishedDate}</span>
                      {article.wordCount != null && (
                        <span className="text-xs text-[#006025]">
                          {article.wordCount.toLocaleString()} words{data.accessLevel ? ` · ${data.accessLevel}` : ''}{article.analyseDurationMs != null ? ` · ${Math.round(article.analyseDurationMs / 1000)}s` : ''}
                        </span>
                      )}
                      {insightCount > 0 && (
                        <span className="text-xs text-[#006025]">
                          {insightCount} insight{insightCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#00e05a] hover:text-[#00f060] transition-colors line-clamp-2"
                    >
                      {data.title}
                    </a>
                    {data.executiveSummary && (
                      <p className="text-xs text-[#006025] mt-1 line-clamp-2">{data.executiveSummary}</p>
                    )}
                    {data.fetchError && (
                      <p className="text-xs text-red-500 mt-1">Gather error: {data.fetchError}</p>
                    )}
                    {data.analyseError && (
                      <p className="text-xs text-amber-500 mt-1">Analyse error: {data.analyseError}</p>
                    )}
                    {data.tags && data.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {data.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArticleActions articleId={article.id} status={article.status as ArticleStatus} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
