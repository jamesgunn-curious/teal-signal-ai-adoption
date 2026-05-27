import { NextResponse } from 'next/server'
import { db } from '@/db'
import { insights } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { insightCurationFlow, validateTransition } from '@/lib/flow'
import type { InsightStatus } from '@/lib/types'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { action, role = 'researcher' } = body

  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const [insight] = await db.select().from(insights).where(eq(insights.id, id))
  if (!insight) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = validateTransition(
    insightCurationFlow,
    insight.status as InsightStatus,
    action,
    role,
  )

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const [updated] = await db.update(insights)
    .set({ status: result.to, updatedAt: new Date() })
    .where(eq(insights.id, id))
    .returning()

  return NextResponse.json(updated)
}
