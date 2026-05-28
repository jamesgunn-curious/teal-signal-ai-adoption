// Status discriminated unions — never use plain string for these
export type ArticleStatus = 'discovered' | 'fetched' | 'processed' | 'archived' | 'paywalled' | 'failed'
export type InsightStatus = 'extracted' | 'curated' | 'dismissed'
export type TopicStatus = 'active' | 'archived'
export type SourceStatus = 'active' | 'paused' | 'removed'

export type Perspective = 'practitioner' | 'leadership' | 'product' | 'research' | 'editorial'
export type Tier = '1' | '2'
export type AccessLevel = 'full' | 'partial' | 'thin'
export type AccessType = 'free' | 'free+paid'

// Variable article content — stored as JSONB in articles.data per ADR-002
// full_text is NOT here — it is a dedicated text column per ADR-003
export interface ArticleData {
  title: string
  perspective: Perspective
  tier: Tier
  wordCount?: number
  accessLevel?: AccessLevel
  executiveSummary?: string
  tags: string[]
  fetchError?: string    // set when gather fails or content is thin; article stays in discovered
  analyseError?: string  // set when Claude analysis fails; article stays in fetched for retry
}

export interface ArticleInstance {
  id: string
  entityType: 'article'
  topicId: string
  sourceSlug: string
  url: string
  publishedDate: string
  status: ArticleStatus
  data: ArticleData
  fullText: string | null
  createdAt: string
  updatedAt: string
}

export interface InsightInstance {
  id: string
  entityType: 'insight'
  articleId: string
  status: InsightStatus
  text: string
  quote: string
  tags: string[]
  perspective: Perspective
  createdAt: string
  updatedAt: string
}

export interface TopicInstance {
  id: string
  entityType: 'topic'
  name: string
  description: string
  lookbackDays: number
  hypotheses: string[]
  status: TopicStatus
  createdAt: string
  updatedAt: string
}

export interface SourceInstance {
  id: string
  entityType: 'source'
  topicId: string
  name: string
  slug: string
  feedUrl: string
  perspective: Perspective
  tier: Tier
  accessType: AccessType
  status: SourceStatus
  createdAt: string
  updatedAt: string
}
