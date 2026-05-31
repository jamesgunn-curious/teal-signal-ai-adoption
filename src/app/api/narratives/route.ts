import { NextResponse } from 'next/server'
import { db } from '@/db'
import { narratives } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const TOPIC_ID = 'ai-adoption'

export async function GET() {
  const rows = await db.select().from(narratives)
    .where(eq(narratives.topicId, TOPIC_ID))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { title, description } = await req.json() as { title: string; description?: string }
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const [row] = await db.insert(narratives).values({
    id: randomUUID(),
    topicId: TOPIC_ID,
    title: title.trim(),
    description: description?.trim() || null,
    status: 'active',
    parentId: null,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
