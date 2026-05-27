'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Perspective } from '@/lib/types'

const PERSPECTIVES: Perspective[] = ['practitioner', 'leadership', 'product', 'research', 'editorial']

export function AddSourceForm({ topicId }: { topicId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', feedUrl: '', perspective: 'practitioner' as Perspective, tier: '1' as '1' | '2',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`/api/topics/${topicId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setForm({ name: '', slug: '', feedUrl: '', perspective: 'practitioner', tier: '1' })
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="text-xs px-2.5 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
    >
      + Add source
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required
            className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} required
            placeholder="my-newsletter"
            className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300 font-mono" />
        </div>
      </div>
      <div>
        <label className="text-xs text-neutral-500 block mb-1">Feed URL</label>
        <input value={form.feedUrl} onChange={e => set('feedUrl', e.target.value)} required type="url"
          placeholder="https://example.com/feed"
          className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Perspective</label>
          <select value={form.perspective} onChange={e => set('perspective', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300 capitalize">
            {PERSPECTIVES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Tier</label>
          <select value={form.tier} onChange={e => set('tier', e.target.value as '1' | '2')}
            className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300">
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 bg-neutral-900 text-white text-sm rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors">
          {loading ? 'Adding…' : 'Add source'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
