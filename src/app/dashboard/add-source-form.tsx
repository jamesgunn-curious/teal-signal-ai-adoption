'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Perspective } from '@/lib/types'

const PERSPECTIVES: Perspective[] = ['practitioner', 'leadership', 'product', 'research', 'editorial']

const inputCls = 'w-full px-2 py-1.5 text-sm rounded bg-[#0f0f0f] border border-[#00e05a44] text-[#00e05a] placeholder-[#006025] focus:outline-none focus:ring-1 focus:ring-[#00e05a66]'
const labelCls = 'text-xs text-[#00a040] block mb-1'

type ResolveResult = {
  feedUrl: string
  feedType: 'rss' | 'scrape'
  method: string
  originalUrl: string
  suggestedName: string | null
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
}

export function AddSourceForm({ topicId }: { topicId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState<ResolveResult | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', inputUrl: '', feedUrl: '', perspective: 'practitioner' as Perspective, tier: '1' as '1' | '2',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function resolveUrl(raw: string) {
    if (!raw.trim()) return
    setResolving(true)
    setResolved(null)
    setResolveError(null)
    try {
      const res = await fetch('/api/sources/resolve-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw.trim() }),
      })
      const data = await res.json() as ResolveResult & { error?: string }
      if (!res.ok || data.error) {
        setResolveError(data.error ?? 'Could not resolve URL')
        return
      }
      setResolved(data)
      setForm(f => {
        const autoName = f.name || data.suggestedName || ''
        const autoSlug = f.slug || slugify(
          autoName ||
          new URL(data.feedUrl).hostname.replace(/\.substack\.com$/, '').replace(/^www\./, '').replace(/^newsletter\./, '')
        )
        return { ...f, feedUrl: data.feedUrl, name: autoName, slug: autoSlug }
      })
    } catch {
      setResolveError('Network error resolving URL')
    } finally {
      setResolving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.feedUrl) return
    setLoading(true)
    try {
      const slug = form.slug || slugify(form.name)
      await fetch(`/api/topics/${topicId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug,
          feedUrl: form.feedUrl,
          perspective: form.perspective,
          tier: form.tier,
        }),
      })
      setForm({ name: '', slug: '', inputUrl: '', feedUrl: '', perspective: 'practitioner', tier: '1' })
      setResolved(null)
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const resolveStatus = resolving
    ? 'resolving'
    : resolveError
    ? 'error'
    : resolved
    ? resolved.feedType
    : null

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="text-xs px-2.5 py-1 rounded border border-[#00e05a33] text-[#00a040] hover:bg-[#0f1a12] transition-colors">
      + Add source
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 border border-[#00e05a22] rounded-lg bg-[#0f0f0f] space-y-3">

      {/* URL input — resolves on blur */}
      <div>
        <label className={labelCls}>URL <span className="text-[#006025]">— paste any page, profile, or feed URL</span></label>
        <div className="relative">
          <input
            value={form.inputUrl}
            onChange={e => { set('inputUrl', e.target.value); setResolved(null); setResolveError(null) }}
            onBlur={e => resolveUrl(e.target.value)}
            type="url"
            required
            placeholder="https://substack.com/@author or https://example.com"
            className={inputCls}
          />
          {resolving && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#006025]">finding feed…</span>
          )}
        </div>

        {/* Resolve result */}
        {resolveStatus === 'rss' && resolved && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] text-[#00e05a]">✓ Feed found</span>
            <span className="text-[10px] text-[#006025] font-mono truncate max-w-xs">{resolved.feedUrl}</span>
            <span className="text-[10px] text-[#006025] opacity-60">via {resolved.method}</span>
          </div>
        )}
        {resolveStatus === 'scrape' && resolved && (
          <div className="mt-1.5">
            <span className="text-[10px] text-amber-500">⚠ No feed found — will save URL for manual gather</span>
          </div>
        )}
        {resolveStatus === 'error' && (
          <div className="mt-1.5">
            <span className="text-[10px] text-red-500">{resolveError}</span>
          </div>
        )}
      </div>

      {/* Feed URL — editable override */}
      {(resolved || form.feedUrl) && (
        <div>
          <label className={labelCls}>Feed URL <span className="text-[#006025]">— edit to override</span></label>
          <input
            value={form.feedUrl}
            onChange={e => set('feedUrl', e.target.value)}
            type="url"
            className={`${inputCls} font-mono text-xs`}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input
            value={form.name}
            onChange={e => {
              set('name', e.target.value)
              if (!form.slug) set('slug', slugify(e.target.value))
            }}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} required
            placeholder="my-newsletter" className={`${inputCls} font-mono`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Perspective</label>
          <select value={form.perspective} onChange={e => set('perspective', e.target.value)}
            className={`${inputCls} capitalize`}>
            {PERSPECTIVES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tier</label>
          <select value={form.tier} onChange={e => set('tier', e.target.value as '1' | '2')} className={inputCls}>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading || !form.feedUrl || !form.name || !form.slug}
          className="px-3 py-1.5 bg-[#00e05a] text-[#0a0a0a] text-sm rounded font-medium hover:bg-[#00f060] disabled:opacity-50 transition-colors">
          {loading ? 'Adding…' : 'Add source'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResolved(null); setResolveError(null) }}
          className="px-3 py-1.5 text-sm text-[#00a040] hover:text-[#00e05a] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
