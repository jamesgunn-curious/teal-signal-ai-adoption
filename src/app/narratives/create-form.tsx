'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateNarrativeForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/narratives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      setTitle('')
      setDescription('')
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium bg-[#00e05a] text-[#0a0a0a] rounded hover:bg-[#00f060] transition-colors"
      >
        + New narrative
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Narrative title — e.g. 'LLMs as typists vs architects'"
          className="w-80 px-3 py-1.5 text-xs bg-[#0f1a12] border border-[#00e05a44] text-[#00e05a] rounded placeholder:text-[#006025] focus:outline-none focus:border-[#00e05a]"
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-80 px-3 py-1.5 text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#00c050] rounded placeholder:text-[#006025] focus:outline-none focus:border-[#00e05a44]"
        />
      </div>
      <button type="submit" disabled={saving || !title.trim()}
        className="px-3 py-1.5 text-xs font-medium bg-[#00e05a] text-[#0a0a0a] rounded hover:bg-[#00f060] disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : 'Create'}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-xs text-[#006025] hover:text-[#00a040] transition-colors">
        Cancel
      </button>
    </form>
  )
}
