import { db } from '@/db'
import { articles, insights } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { TopNav } from './top-nav'

export async function NavWrapper() {
  const [articleCounts, insightCounts] = await Promise.all([
    db.select({ status: articles.status, count: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.topicId, 'ai-adoption'))
      .groupBy(articles.status),
    db.select({ status: insights.status, count: sql<number>`count(*)::int` })
      .from(insights)
      .groupBy(insights.status),
  ])

  const ac = (status: string) => articleCounts.find(r => r.status === status)?.count ?? 0
  const ic = (status: string) => insightCounts.find(r => r.status === status)?.count ?? 0

  return (
    <TopNav
      counts={{
        // Article queue: discovered (needs fetch) + fetched (needs analyse)
        queue:  ac('discovered') + ac('fetched'),
        curate: ic('extracted'),
      }}
    />
  )
}
