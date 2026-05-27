import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SourceStatus } from '@/lib/types'

const VALID_STATUSES: SourceStatus[] = ['active', 'paused', 'removed']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const [row] = await db.update(sources)
    .set({ status, updatedAt: new Date() })
    .where(eq(sources.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
