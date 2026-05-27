'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  allTags: string[]
  allSources: { id: string; name: string }[]
  activeTag?: string
  activeSource?: string
}

export function DigestFilters({ allTags, allSources, activeTag, activeSource }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(tag?: string, source?: string) {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (source) params.set('source', source)
    router.push(`/digest${params.size > 0 ? '?' + params.toString() : ''}`)
  }

  const hasFilter = activeTag || activeSource

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-400 w-12 shrink-0">Tag</span>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => navigate(activeTag === tag ? undefined : tag, activeSource)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              activeTag === tag
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-400 w-12 shrink-0">Source</span>
        {allSources.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(activeTag, activeSource === s.id ? undefined : s.id)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              activeSource === s.id
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      {hasFilter && (
        <button
          onClick={() => navigate()}
          className="text-xs text-neutral-400 hover:text-neutral-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
