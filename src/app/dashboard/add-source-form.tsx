'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Perspective } from '@/lib/types'

const PERSPECTIVES: Perspective[] = ['practitioner', 'leadership', 'product', 'research', 'editorial']

const inputCls = 'w-full px-2 py-1.5 text-sm rounded bg-[#0f0f0f] border border-[#00e05a44] text-[#00e05a] placeholder-[#006025] focus:outline-none focus:ring-1 focus:ring-[#00e05a66]'
const labelCls = 'text-xs text-[#00a040] block mb-1'

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
    <button onClick={() => setOpen(true)}
      className="text-xs px-2.5 py-1 rounded border border-[#00e05a33] text-[#00a040] hover:bg-[#0f1a12] transition-colors">
      + Add source
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 border border-[#00e05a22] rounded-lg bg-[#0f0f0f] space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} required
            placeholder="my-newsletter" className={`${inputCls} font-mono`} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Feed URL</label>
        <input value={form.feedUrl} onChange={e => set('feedUrl', e.target.value)} required type="url"
          placeholder="https://example.com/feed" className={inputCls} />
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
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 bg-[#00e05a] text-[#0a0a0a] text-sm rounded font-medium hover:bg-[#00f060] disabled:opacity-50 transition-colors">
          {loading ? 'Adding…' : 'Add source'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm text-[#00a040] hover:text-[#00e05a] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
