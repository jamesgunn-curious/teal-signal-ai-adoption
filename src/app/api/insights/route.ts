import { NextResponse } from 'next/server'
import { db } from '@/db'
import { insights } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const articleId = searchParams.get('articleId')

  const conditions = []
  if (status) conditions.push(eq(insights.status, status))
  if (articleId) conditions.push(eq(insights.articleId, articleId))

  const rows = conditions.length > 0
    ? await db.select().from(insights).where(and(...conditions))
    : await db.select().from(insights)

  return NextResponse.json(rows)
}
