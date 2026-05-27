import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const topicId = searchParams.get('topicId')

  const conditions = []
  if (status) conditions.push(eq(articles.status, status))
  if (topicId) conditions.push(eq(articles.topicId, topicId))

  const rows = conditions.length > 0
    ? await db.select().from(articles).where(and(...conditions))
    : await db.select().from(articles)

  return NextResponse.json(rows)
}
