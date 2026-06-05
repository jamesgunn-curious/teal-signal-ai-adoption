'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

type DormantMode = null | 'chooser' | 'fold' | 'split'

interface LinkedInsight {
  linkId: string
  insightId: string
  insightText: string
  insightQuote: string | null
  insightStatus: string
  insightPerspective: string
  insightTags: string[]
  insightModel: string | null
  articleTitle: string | null
  articleUrl: string
  articleSource: string
  articleDate: string
  note: string | null
}

interface Narrative {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
}

interface AvailableInsight {
  insightId: string
  insightText: string
  perspective: string
  articleTitle: string | null
  articleUrl: string
  articleSource: string
  articleDate: string
}

interface OtherNarrative {
  id: string
  title: string
  status: string
}

interface Props {
  narrative: Narrative
  linkedInsights: LinkedInsight[]
}

function statusColour(status: string) {
  if (status === 'active') return 'text-[#00c050]'
  if (status === 'dormant') return 'text-[#555]'
  return 'text-[#007830]'
}

export function NarrativeDetailClient({ narrative, linkedInsights }: Props) {
  const router = useRouter()
  const role = useStore(s => s.role)
  const isResearcher = role === 'researcher'

  // --- Edit mode state ---
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(narrative.title)
  const [editDesc, setEditDesc] = useState(narrative.description ?? '')
  const [saving, setSaving] = useState(false)

  // --- Dormant flow state ---
  const [dormantMode, setDormantMode] = useState<DormantMode>(null)
  const [dormantLoading, setDormantLoading] = useState(false)
  const [otherNarratives, setOtherNarratives] = useState<OtherNarrative[]>([])
  const [foldTargetId, setFoldTargetId] = useState('')
  const [splitTitles, setSplitTitles] = useState<[string, string]>(['', ''])

  // --- Add evidence state ---
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [availableInsights, setAvailableInsights] = useState<AvailableInsight[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const openEvidence = useCallback(async () => {
    setEvidenceOpen(true)
    setEvidenceLoading(true)
    try {
      const res = await fetch(`/api/narratives/${narrative.id}/available-insights`)
      const data = await res.json() as AvailableInsight[]
      setAvailableInsights(data)
    } finally {
      setEvidenceLoading(false)
    }
  }, [narrative.id])

  const closeEvidence = useCallback(() => {
    setEvidenceOpen(false)
    setSearchFilter('')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/narratives/${narrative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [narrative.id, editTitle, editDesc, router])

  const handleStatusChange = useCallback(async (status: string) => {
    await fetch(`/api/narratives/${narrative.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }, [narrative.id, router])

  const openDormantChooser = useCallback(async () => {
    setDormantMode('chooser')
    const res = await fetch('/api/narratives')
    const all = await res.json() as OtherNarrative[]
    setOtherNarratives(all.filter(n => n.id !== narrative.id && n.status === 'active'))
  }, [narrative.id])

  const handlePause = useCallback(async () => {
    setDormantLoading(true)
    try {
      await fetch(`/api/narratives/${narrative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dormant' }),
      })
      setDormantMode(null)
      router.refresh()
    } finally {
      setDormantLoading(false)
    }
  }, [narrative.id, router])

  const handleFoldInto = useCallback(async () => {
    if (!foldTargetId) return
    setDormantLoading(true)
    try {
      await fetch(`/api/narratives/${narrative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed', parentId: foldTargetId }),
      })
      router.push('/narratives')
    } finally {
      setDormantLoading(false)
    }
  }, [narrative.id, foldTargetId, router])

  const handleSplitInto = useCallback(async () => {
    const [t1, t2] = splitTitles
    if (!t1.trim() || !t2.trim()) return
    setDormantLoading(true)
    try {
      await Promise.all([
        fetch('/api/narratives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t1.trim(), parentId: narrative.id }),
        }),
        fetch('/api/narratives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t2.trim(), parentId: narrative.id }),
        }),
      ])
      await fetch(`/api/narratives/${narrative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      router.push('/narratives')
    } finally {
      setDormantLoading(false)
    }
  }, [narrative.id, splitTitles, router])

  const handleLink = useCallback(async (insightId: string) => {
    setLinkingId(insightId)
    try {
      await fetch(`/api/narratives/${narrative.id}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })
      setAvailableInsights(prev => prev.filter(i => i.insightId !== insightId))
      router.refresh()
    } finally {
      setLinkingId(null)
    }
  }, [narrative.id, router])

  const handleRemove = useCallback(async (insightId: string) => {
    setRemovingId(insightId)
    try {
      await fetch(`/api/narratives/${narrative.id}/insights`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })
      router.refresh()
    } finally {
      setRemovingId(null)
    }
  }, [narrative.id, router])

  const filteredAvailable = availableInsights.filter(i => {
    const q = searchFilter.toLowerCase()
    if (!q) return true
    return (
      i.insightText.toLowerCase().includes(q) ||
      i.articleSource.toLowerCase().includes(q) ||
      (i.articleTitle ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="px-8 pb-8">

      {/* Narrative header */}
      <div className="mb-8 pb-6 border-b border-[#00e05a15]">
        {editing ? (
          <div className="space-y-3">
            <input
              className="w-full bg-[#0f0f0f] border border-[#00e05a33] rounded-lg px-3 py-2 text-sm text-[#00e05a] placeholder-[#006025] outline-none focus:border-[#00e05a66]"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Narrative title"
            />
            <textarea
              className="w-full bg-[#0f0f0f] border border-[#00e05a33] rounded-lg px-3 py-2 text-sm text-[#007830] placeholder-[#006025] outline-none focus:border-[#00e05a66] resize-none"
              rows={3}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editTitle.trim()}
                className="text-xs bg-[#00e05a] text-[#0a0a0a] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditTitle(narrative.title); setEditDesc(narrative.description ?? '') }}
                className="text-xs border border-[#00e05a44] text-[#00a040] px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-semibold text-[#00e05a] leading-snug mb-2">{narrative.title}</h1>
              {isResearcher && (
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-xs border border-[#00e05a44] text-[#00a040] px-3 py-1.5 rounded-lg hover:border-[#00e05a88]"
                >
                  Edit
                </button>
              )}
            </div>
            {narrative.description && (
              <p className="text-sm text-[#007830] mb-3">{narrative.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[10px] uppercase tracking-wide font-semibold ${statusColour(narrative.status)}`}>
                {narrative.status}
              </span>
              <span className="text-[10px] text-[#006025]">
                created {narrative.createdAt.slice(0, 10)}
              </span>
              {isResearcher && (
                <div className="ml-2">
                  {narrative.status === 'active' && dormantMode === null && (
                    <div className="flex gap-2">
                      <button
                        onClick={openDormantChooser}
                        className="text-[10px] border border-[#00e05a22] text-[#555] px-2 py-1 rounded hover:border-[#00e05a44]"
                      >
                        Mark dormant
                      </button>
                      <button
                        onClick={() => handleStatusChange('closed')}
                        className="text-[10px] border border-[#00e05a22] text-[#006025] px-2 py-1 rounded hover:border-[#00e05a44]"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {narrative.status === 'active' && dormantMode === 'chooser' && (
                    <div className="bg-[#0f0f0f] border border-[#00e05a22] rounded-lg px-4 py-3 mt-2 space-y-2 max-w-sm">
                      <p className="text-[10px] text-[#006025] uppercase tracking-wide mb-1">Why is this going dormant?</p>
                      <button
                        onClick={handlePause}
                        disabled={dormantLoading}
                        className="w-full text-left text-xs text-[#00a040] hover:text-[#00e05a] py-1 disabled:opacity-50"
                      >
                        Pause — may revive later
                      </button>
                      <button
                        onClick={() => setDormantMode('fold')}
                        disabled={dormantLoading}
                        className="w-full text-left text-xs text-[#00a040] hover:text-[#00e05a] py-1 disabled:opacity-50"
                      >
                        Fold into another narrative →
                      </button>
                      <button
                        onClick={() => setDormantMode('split')}
                        disabled={dormantLoading}
                        className="w-full text-left text-xs text-[#00a040] hover:text-[#00e05a] py-1 disabled:opacity-50"
                      >
                        Split into two narratives →
                      </button>
                      <button
                        onClick={() => setDormantMode(null)}
                        className="text-[10px] text-[#555] hover:text-[#777] pt-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {narrative.status === 'active' && dormantMode === 'fold' && (
                    <div className="bg-[#0f0f0f] border border-[#00e05a22] rounded-lg px-4 py-3 mt-2 space-y-2 max-w-sm">
                      <p className="text-[10px] text-[#006025] uppercase tracking-wide mb-1">Fold into</p>
                      {otherNarratives.length === 0 ? (
                        <p className="text-xs text-[#555]">No other active narratives.</p>
                      ) : (
                        <select
                          value={foldTargetId}
                          onChange={e => setFoldTargetId(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#00e05a33] rounded px-2 py-1.5 text-xs text-[#00a040] outline-none"
                        >
                          <option value="">Select narrative…</option>
                          {otherNarratives.map(n => (
                            <option key={n.id} value={n.id}>{n.title}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleFoldInto}
                          disabled={dormantLoading || !foldTargetId}
                          className="text-xs bg-[#00e05a] text-[#0a0a0a] font-semibold px-3 py-1 rounded disabled:opacity-50"
                        >
                          {dormantLoading ? 'Folding…' : 'Fold & close'}
                        </button>
                        <button onClick={() => setDormantMode('chooser')} className="text-[10px] text-[#555] hover:text-[#777]">Back</button>
                      </div>
                    </div>
                  )}

                  {narrative.status === 'active' && dormantMode === 'split' && (
                    <div className="bg-[#0f0f0f] border border-[#00e05a22] rounded-lg px-4 py-3 mt-2 space-y-2 max-w-sm">
                      <p className="text-[10px] text-[#006025] uppercase tracking-wide mb-1">Split into two new narratives</p>
                      <input
                        className="w-full bg-[#0a0a0a] border border-[#00e05a22] rounded px-2 py-1.5 text-xs text-[#00e05a] placeholder-[#006025] outline-none focus:border-[#00e05a44]"
                        placeholder="First narrative title"
                        value={splitTitles[0]}
                        onChange={e => setSplitTitles([e.target.value, splitTitles[1]])}
                      />
                      <input
                        className="w-full bg-[#0a0a0a] border border-[#00e05a22] rounded px-2 py-1.5 text-xs text-[#00e05a] placeholder-[#006025] outline-none focus:border-[#00e05a44]"
                        placeholder="Second narrative title"
                        value={splitTitles[1]}
                        onChange={e => setSplitTitles([splitTitles[0], e.target.value])}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSplitInto}
                          disabled={dormantLoading || !splitTitles[0].trim() || !splitTitles[1].trim()}
                          className="text-xs bg-[#00e05a] text-[#0a0a0a] font-semibold px-3 py-1 rounded disabled:opacity-50"
                        >
                          {dormantLoading ? 'Splitting…' : 'Split & close'}
                        </button>
                        <button onClick={() => setDormantMode('chooser')} className="text-[10px] text-[#555] hover:text-[#777]">Back</button>
                      </div>
                    </div>
                  )}

                  {narrative.status === 'dormant' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="text-[10px] border border-[#00e05a22] text-[#00a040] px-2 py-1 rounded hover:border-[#00e05a44]"
                    >
                      Reactivate
                    </button>
                  )}
                  {narrative.status === 'dormant' && (
                    <button
                      onClick={() => handleStatusChange('closed')}
                      className="text-[10px] border border-[#00e05a22] text-[#006025] px-2 py-1 ml-2 rounded hover:border-[#00e05a44]"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add evidence */}
      {isResearcher && (
        <div className="mb-6">
          {!evidenceOpen ? (
            <button
              onClick={openEvidence}
              className="text-xs bg-[#00e05a] text-[#0a0a0a] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#00c050]"
            >
              Add evidence
            </button>
          ) : (
            <div className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#00e05a]">Add evidence</span>
                <button
                  onClick={closeEvidence}
                  className="text-xs text-[#006025] hover:text-[#00a040]"
                >
                  Close
                </button>
              </div>
              <input
                className="w-full bg-[#0a0a0a] border border-[#00e05a22] rounded-lg px-3 py-2 text-xs text-[#00e05a] placeholder-[#006025] outline-none focus:border-[#00e05a44] mb-3"
                placeholder="Filter by insight text, source, or article…"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
              />
              {evidenceLoading ? (
                <p className="text-xs text-[#006025] py-4 text-center">Loading…</p>
              ) : filteredAvailable.length === 0 ? (
                <p className="text-xs text-[#006025] py-4 text-center">
                  {searchFilter ? 'No matching insights.' : 'No available curated insights.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredAvailable.map(insight => (
                    <div
                      key={insight.insightId}
                      className="flex items-start gap-3 bg-[#0a0a0a] rounded border border-[#00e05a15] px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#00a040] leading-relaxed line-clamp-2">{insight.insightText}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#006025]">{insight.articleSource}</span>
                          <span className="text-[10px] text-[#006025]">·</span>
                          <span className="text-[10px] text-[#006025]">{insight.articleDate}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLink(insight.insightId)}
                        disabled={linkingId === insight.insightId}
                        className="shrink-0 text-[10px] bg-[#00e05a] text-[#0a0a0a] font-semibold px-2 py-1 rounded disabled:opacity-50"
                      >
                        {linkingId === insight.insightId ? '…' : 'Link'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Linked insights list */}
      {linkedInsights.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[#006025] mb-1">No insights attached yet.</p>
          {isResearcher && (
            <p className="text-xs text-[#006025]">
              Use &ldquo;Add evidence&rdquo; above to link curated insights to this narrative.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {linkedInsights.map(item => (
            <div key={item.linkId} className="bg-[#0f0f0f] rounded-lg border border-[#00e05a22] px-5 py-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm text-[#00e05a] leading-relaxed flex-1">{item.insightText}</p>
                {item.insightStatus === 'curated'
                  ? <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#00e05a] text-[#0a0a0a] shrink-0 mt-0.5">reviewed</span>
                  : <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-[#00e05a22] text-[#006025] shrink-0 mt-0.5">extracted</span>
                }
              </div>
              {item.insightQuote && (
                <blockquote className="pl-3 border-l-2 border-[#00e05a33] text-xs text-[#00a040] italic mb-3">
                  {item.insightQuote}
                </blockquote>
              )}
              {item.note && (
                <p className="text-xs text-[#00c050] bg-[#0f1a12] rounded px-3 py-2 mb-3 border border-[#00e05a22]">
                  ✎ {item.note}
                </p>
              )}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#007830] capitalize">{item.insightPerspective}</span>
                  <span className="text-xs text-[#006025]">·</span>
                  <span className="text-xs text-[#006025]">{item.articleSource}</span>
                  <span className="text-xs text-[#006025]">·</span>
                  <span className="text-xs text-[#006025]">{item.articleDate}</span>
                  {item.insightModel && (
                    <span className="text-[9px] text-[#006025] font-mono">{item.insightModel}</span>
                  )}
                  {item.insightTags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs bg-[#0f1a12] border border-[#00e05a22] text-[#007830] px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.articleTitle && (
                    <a
                      href={item.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#006025] hover:text-[#00a040] underline"
                    >
                      {item.articleTitle.length > 35
                        ? `${item.articleTitle.slice(0, 35)}…`
                        : item.articleTitle}
                    </a>
                  )}
                  {isResearcher && (
                    <button
                      onClick={() => handleRemove(item.insightId)}
                      disabled={removingId === item.insightId}
                      className="text-[10px] border border-[#00e05a22] text-[#555] px-2 py-1 rounded hover:text-[#cc4444] hover:border-[#cc444433] disabled:opacity-50"
                    >
                      {removingId === item.insightId ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
