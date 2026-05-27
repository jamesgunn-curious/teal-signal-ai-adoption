import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const rows = await db.select().from(topics).where(eq(topics.status, 'active'))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { id, name, description, lookbackDays = 30 } = body

  if (!id || !name || !description) {
    return NextResponse.json({ error: 'id, name, description required' }, { status: 400 })
  }

  const [row] = await db.insert(topics).values({
    id,
    name,
    description,
    lookbackDays,
    hypotheses: [],
    status: 'active',
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
