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
  perspective: text('perspective').notNull(), // Perspective enum
  tier: text('tier').notNull(), // '1' | '2'
  accessType: text('access_type').notNull().default('free'), // 'free' | 'free+paid'
  status: text('status').notNull().default('active'), // SourceStatus
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// data column: ArticleData fields (title, perspective, tier, wordCount, accessLevel, executiveSummary, tags)
// full_text: dedicated text column per ADR-003 (not in data JSONB per ADR-002)
export const articles = pgTable('articles', {
  id: text('id').primaryKey(), // slug: {source}--{date}--{title-slug}
  topicId: text('topic_id').notNull().references(() => topics.id),
  sourceSlug: text('source_slug').notNull().references(() => sources.id),
  url: text('url').notNull().unique(), // deduplication key
  publishedDate: text('published_date').notNull(),
  status: text('status').notNull().default('discovered'), // ArticleStatus
  data: jsonb('data').notNull().default({}), // ArticleData
  fullText: text('full_text'), // populated at fetch step; dedicated column per ADR-003
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
