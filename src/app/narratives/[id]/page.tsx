import { db } from '@/db'
import { narratives, narrativeInsights, insights, articles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import type { ArticleData } from '@/lib/types'
import { NarrativeDetailClient } from './narrative-detail-client'

export default async function NarrativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [narrative] = await db.select().from(narratives).where(eq(narratives.id, id))
  if (!narrative) notFound()

  const rows = await db
    .select({
      link: narrativeInsights,
      insight: insights,
      articleData: articles.data,
      articleUrl: articles.url,
      articleSourceSlug: articles.sourceSlug,
      articlePublishedDate: articles.publishedDate,
    })
    .from(narrativeInsights)
    .innerJoin(insights, eq(narrativeInsights.insightId, insights.id))
    .innerJoin(articles, eq(insights.articleId, articles.id))
    .where(eq(narrativeInsights.narrativeId, id))

  // Sort by article published date descending
  rows.sort((a, b) =>
    new Date(b.articlePublishedDate).getTime() - new Date(a.articlePublishedDate).getTime()
  )

  const linkedInsights = rows.map(({ link, insight, articleData, articleUrl, articleSourceSlug, articlePublishedDate }) => {
    const data = articleData as ArticleData
    return {
      linkId: link.id,
      insightId: insight.id,
      insightText: insight.text,
      insightQuote: insight.quote ?? null,
      insightPerspective: insight.perspective,
      insightTags: insight.tags,
      insightModel: insight.model ?? null,
      articleTitle: data.title ?? null,
      articleUrl,
      articleSource: articleSourceSlug,
      articleDate: articlePublishedDate,
      note: link.note ?? null,
    }
  })

  const narrativePlain = {
    id: narrative.id,
    title: narrative.title,
    description: narrative.description ?? null,
    status: narrative.status,
    createdAt: narrative.createdAt.toISOString(),
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        crumbs={['Output', 'Narratives']}
        back={{ label: 'All narratives', href: '/narratives' }}
        stats={[
          { n: linkedInsights.length, label: 'insights', accent: linkedInsights.length > 0 },
        ]}
      />
      <NarrativeDetailClient
        narrative={narrativePlain}
        linkedInsights={linkedInsights}
      />
    </div>
  )
}
