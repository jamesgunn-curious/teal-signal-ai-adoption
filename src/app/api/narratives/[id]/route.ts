import { NextResponse } from 'next/server'
import { db } from '@/db'
import { narratives } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { NarrativeStatus } from '@/lib/types'

const VALID_STATUSES: NarrativeStatus[] = ['active', 'dormant', 'closed']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [row] = await db.select().from(narratives).where(eq(narratives.id, id))
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { title?: string; description?: string | null; status?: string }

  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (body.title !== undefined) {
    if (!body.title?.trim()) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    update.title = body.title.trim()
  }
  if ('description' in body) {
    update.description = body.description?.trim() || null
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as NarrativeStatus)) {
      return NextResponse.json({ error: `invalid status: ${body.status}` }, { status: 422 })
    }
    update.status = body.status
  }

  const [row] = await db.update(narratives).set(update).where(eq(narratives.id, id)).returning()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
