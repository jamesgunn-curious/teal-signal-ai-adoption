import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, description, lookbackDays, hypotheses, status } = body

  const updates: Partial<typeof topics.$inferInsert> = { updatedAt: new Date() }
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (lookbackDays !== undefined) updates.lookbackDays = lookbackDays
  if (hypotheses !== undefined) updates.hypotheses = hypotheses
  if (status !== undefined) updates.status = status

  const [row] = await db.update(topics).set(updates).where(eq(topics.id, id)).returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
