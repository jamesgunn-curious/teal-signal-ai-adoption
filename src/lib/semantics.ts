import type { ArticleStatus, InsightStatus, TopicStatus, SourceStatus } from './types'

interface EntityTypeConfig<TStatus extends string> {
  entityType: string
  states: TStatus[]
  terminalStates: TStatus[]
  roles: string[]
  flowType: string | null
}

export const articleConfig: EntityTypeConfig<ArticleStatus> = {
  entityType: 'article',
  states: ['discovered', 'fetched', 'processed', 'archived', 'paywalled', 'failed'],
  terminalStates: ['archived', 'paywalled', 'failed'],
  roles: ['researcher', 'reader'],
  flowType: 'article-ingestion',
}

export const insightConfig: EntityTypeConfig<InsightStatus> = {
  entityType: 'insight',
  states: ['extracted', 'curated', 'dismissed'],
  terminalStates: ['curated', 'dismissed'],
  roles: ['researcher', 'reader'],
  flowType: 'insight-curation',
}

export const topicConfig: EntityTypeConfig<TopicStatus> = {
  entityType: 'topic',
  states: ['active', 'archived'],
  terminalStates: ['archived'],
  roles: ['researcher', 'reader'],
  flowType: null,
}

export const sourceConfig: EntityTypeConfig<SourceStatus> = {
  entityType: 'source',
  states: ['active', 'paused', 'removed'],
  terminalStates: ['removed'],
  roles: ['researcher', 'reader'],
  flowType: null,
}
