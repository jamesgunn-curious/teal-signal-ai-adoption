'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Perspective, Tier } from '@/lib/types'

const PERSPECTIVES: Perspective[] = ['practitioner', 'leadership', 'product', 'research', 'editorial']

const inputCls = 'w-full px-2 py-1 text-xs rounded bg-[#0a0a0a] border border-[#00e05a44] text-[#00e05a] placeholder-[#006025] focus:outline-none focus:ring-1 focus:ring-[#00e05a66]'
const labelCls = 'text-xs text-[#006025] block mb-0.5'

interface Props {
  sourceId: string
  initial: { name: string; feedUrl: string; perspective: Perspective; tier: Tier }
  onClose: () => void
}

export function EditSourceForm({ sourceId, initial, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(initial)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      onClose()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 border border-[#00e05a22] rounded-lg bg-[#0a0a0a] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Feed URL</label>
          <input value={form.feedUrl} onChange={e => set('feedUrl', e.target.value)} required type="url" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Perspective</label>
          <select value={form.perspective} onChange={e => set('perspective', e.target.value)} className={`${inputCls} capitalize`}>
            {PERSPECTIVES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tier</label>
          <select value={form.tier} onChange={e => set('tier', e.target.value as Tier)} className={inputCls}>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-0.5">
        <button type="submit" disabled={loading}
          className="px-2.5 py-1 bg-[#00e05a] text-[#0a0a0a] text-xs rounded font-medium hover:bg-[#00f060] disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose}
          className="px-2.5 py-1 text-xs text-[#00a040] hover:text-[#00e05a] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
