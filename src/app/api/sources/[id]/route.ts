import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SourceStatus, Perspective, Tier } from '@/lib/types'

const VALID_STATUSES: SourceStatus[] = ['active', 'paused', 'removed']
const VALID_PERSPECTIVES: Perspective[] = ['practitioner', 'leadership', 'product', 'research', 'editorial']
const VALID_TIERS: Tier[] = ['1', '2']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { status, name, feedUrl, perspective, tier, accessType } = body

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }
  if (perspective !== undefined && !VALID_PERSPECTIVES.includes(perspective)) {
    return NextResponse.json({ error: `perspective must be one of: ${VALID_PERSPECTIVES.join(', ')}` }, { status: 400 })
  }
  if (tier !== undefined && !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: `tier must be 1 or 2` }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (status !== undefined)      updates.status      = status
  if (name !== undefined)        updates.name        = name
  if (feedUrl !== undefined)     updates.feedUrl     = feedUrl
  if (perspective !== undefined) updates.perspective = perspective
  if (tier !== undefined)        updates.tier        = tier
  if (accessType !== undefined)  updates.accessType  = accessType

  const [row] = await db.update(sources)
    .set(updates)
    .where(eq(sources.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
