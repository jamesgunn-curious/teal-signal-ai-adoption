'use client'

import { useState } from 'react'
import { SourcesSection } from './sources-section'
import { ArticleQueue } from './article-queue'

type Source = React.ComponentProps<typeof SourcesSection>['sources'][number]
type Article = React.ComponentProps<typeof ArticleQueue>['articles'][number]

export function PipelineContent({
  sources,
  topicId,
  articles,
  insightCountMap,
}: {
  sources: Source[]
  topicId: string
  articles: Article[]
  insightCountMap: Record<string, number>
}) {
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  return (
    <>
      <SourcesSection
        sources={sources}
        topicId={topicId}
        activeSourceFilter={sourceFilter}
        onSourceFilter={setSourceFilter}
      />
      <ArticleQueue
        articles={articles}
        insightCountMap={insightCountMap}
        sourceFilter={sourceFilter}
      />
    </>
  )
}
