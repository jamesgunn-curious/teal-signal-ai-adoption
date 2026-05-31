import { NextResponse } from 'next/server'
import { db } from '@/db'
import { insights, articles, narrativeInsights } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: narrativeId } = await params

  // Curated insights NOT already linked to this narrative
  const rows = await db
    .select({
      insightId:     insights.id,
      insightText:   insights.text,
      perspective:   insights.perspective,
      articleTitle:  articles.data,
      articleUrl:    articles.url,
      articleSource: articles.sourceSlug,
      articleDate:   articles.publishedDate,
    })
    .from(insights)
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .leftJoin(
      narrativeInsights,
      and(
        eq(narrativeInsights.insightId, insights.id),
        eq(narrativeInsights.narrativeId, narrativeId),
      ),
    )
    .where(and(
      eq(insights.status, 'curated'),
      isNull(narrativeInsights.insightId),
    ))
    .orderBy(desc(articles.publishedDate))

  const result = rows.map(r => ({
    insightId:    r.insightId,
    insightText:  r.insightText,
    perspective:  r.perspective,
    articleTitle: (r.articleTitle as { title?: string } | null)?.title ?? null,
    articleUrl:   r.articleUrl,
    articleSource: r.articleSource,
    articleDate:  r.articleDate,
  }))

  return NextResponse.json(result)
}
