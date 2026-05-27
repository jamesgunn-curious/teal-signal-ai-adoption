import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await db.select().from(sources).where(eq(sources.topicId, id))
  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params
  const body = await req.json()
  const { slug, name, feedUrl, perspective, tier, accessType = 'free' } = body

  if (!slug || !name || !feedUrl || !perspective || !tier) {
    return NextResponse.json({ error: 'slug, name, feedUrl, perspective, tier required' }, { status: 400 })
  }

  const [row] = await db.insert(sources).values({
    id: slug,
    topicId,
    slug,
    name,
    feedUrl,
    perspective,
    tier,
    accessType,
    status: 'active',
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
