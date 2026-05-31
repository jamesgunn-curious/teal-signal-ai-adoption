import { NextResponse } from 'next/server'
import { db } from '@/db'
import { narrativeInsights, insights, articles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: narrativeId } = await params

  const rows = await db
    .select({ link: narrativeInsights, insight: insights, articleData: articles.data, articleUrl: articles.url, articleSourceSlug: articles.sourceSlug })
    .from(narrativeInsights)
    .innerJoin(insights, eq(narrativeInsights.insightId, insights.id))
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .where(eq(narrativeInsights.narrativeId, narrativeId))

  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: narrativeId } = await params
  const { insightId, note } = await req.json() as { insightId: string; note?: string }
  if (!insightId) return NextResponse.json({ error: 'insightId required' }, { status: 400 })

  const [row] = await db.insert(narrativeInsights).values({
    id: randomUUID(),
    narrativeId,
    insightId,
    note: note?.trim() || null,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: narrativeId } = await params
  const { insightId } = await req.json() as { insightId: string }

  await db.delete(narrativeInsights)
    .where(and(
      eq(narrativeInsights.narrativeId, narrativeId),
      eq(narrativeInsights.insightId, insightId),
    ))

  return new NextResponse(null, { status: 204 })
}
