import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const topics = pgTable('topics', {
  id: text('id').primaryKey(), // slug e.g. 'ai-adoption'
  name: text('name').notNull(),
  description: text('description').notNull(),
  lookbackDays: integer('lookback_days').notNull().default(30),
  hypotheses: text('hypotheses').array().notNull().default([]),
  status: text('status').notNull().default('active'), // TopicStatus
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sources = pgTable('sources', {
  id: text('id').primaryKey(), // slug
  topicId: text('topic_id').notNull().references(() => topics.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  feedUrl: text('feed_url').notNull(),
  feedType: text('feed_type').notNull().default('rss'), // 'rss' | 'scrape'
  perspective: text('perspective').notNull(), // Perspective enum
  tier: text('tier').notNull(), // '1' | '2'
  accessType: text('access_type').notNull().default('free'), // 'free' | 'free+paid'
  status: text('status').notNull().default('active'), // SourceStatus
  lastDiscoveredAt: timestamp('last_discovered_at'), // null = never run; set after each successful scan
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// data column: ArticleData fields (title, perspective, tier, accessLevel, executiveSummary, tags, errors, timing refs)
// full_text: dedicated text column per ADR-003
// word_count, analyse_duration_ms: dedicated integer columns per ADR-007 (numeric metrics, not JSONB)
export const articles = pgTable('articles', {
  id: text('id').primaryKey(), // slug: {source}--{date}--{title-slug}
  topicId: text('topic_id').notNull().references(() => topics.id),
  sourceSlug: text('source_slug').notNull().references(() => sources.id),
  url: text('url').notNull().unique(), // deduplication key
  publishedDate: text('published_date').notNull(),
  status: text('status').notNull().default('discovered'), // ArticleStatus
  data: jsonb('data').notNull().default({}), // ArticleData
  fullText: text('full_text'), // populated at fetch step; dedicated column per ADR-003
  wordCount: integer('word_count'), // set at gather; dedicated column per ADR-007
  analyseDurationMs: integer('analyse_duration_ms'), // set at process; dedicated column per ADR-007
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const insights = pgTable('insights', {
  id: text('id').primaryKey(), // UUID
  articleId: text('article_id').notNull().references(() => articles.id),
  status: text('status').notNull().default('extracted'), // InsightStatus
  text: text('text').notNull(),
  quote: text('quote').notNull(),
  tags: text('tags').array().notNull().default([]),
  perspective: text('perspective').notNull(), // Perspective — inherited from source
  model: text('model'), // model that produced this insight e.g. 'claude-sonnet-4-6', 'qwen2.5:7b'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Narratives — researcher-curated threads tracked across gather runs
export const narratives = pgTable('narratives', {
  id: text('id').primaryKey(), // UUID
  topicId: text('topic_id').notNull().references(() => topics.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'), // 'active' | 'dormant' | 'closed'
  parentId: text('parent_id'), // set on split/converge — references narratives.id
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Junction: insights attached to narratives, with optional researcher note
export const narrativeInsights = pgTable('narrative_insights', {
  id: text('id').primaryKey(), // UUID
  narrativeId: text('narrative_id').notNull().references(() => narratives.id),
  insightId: text('insight_id').notNull().references(() => insights.id),
  note: text('note'), // researcher's annotation
  addedAt: timestamp('added_at').notNull().defaultNow(),
})
