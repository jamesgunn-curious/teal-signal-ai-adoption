import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { articleIngestionFlow, validateTransition } from '@/lib/flow'
import type { ArticleStatus } from '@/lib/types'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { action, role = 'researcher' } = body

  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = validateTransition(
    articleIngestionFlow,
    article.status as ArticleStatus,
    action,
    role,
  )

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const [updated] = await db.update(articles)
    .set({ status: result.to, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning()

  return NextResponse.json(updated)
}
