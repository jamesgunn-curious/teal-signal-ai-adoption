import { db } from '@/db'
import { articles, insights, narratives } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { TopNav } from './top-nav'

export async function NavWrapper() {
  const [articleCounts, insightCounts, narrativeCounts] = await Promise.all([
    db.select({ status: articles.status, count: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.topicId, 'ai-adoption'))
      .groupBy(articles.status),
    db.select({ status: insights.status, count: sql<number>`count(*)::int` })
      .from(insights)
      .groupBy(insights.status),
    db.select({ status: narratives.status, count: sql<number>`count(*)::int` })
      .from(narratives)
      .where(eq(narratives.topicId, 'ai-adoption'))
      .groupBy(narratives.status),
  ])

  const ac = (status: string) => articleCounts.find(r => r.status === status)?.count ?? 0
  const ic = (status: string) => insightCounts.find(r => r.status === status)?.count ?? 0
  const nc = (status: string) => narrativeCounts.find(r => r.status === status)?.count ?? 0

  return (
    <TopNav
      counts={{
        pipeline:   ac('discovered') + ac('fetched'),
        curate:     ic('extracted'),
        narratives: nc('active'),
      }}
    />
  )
}
