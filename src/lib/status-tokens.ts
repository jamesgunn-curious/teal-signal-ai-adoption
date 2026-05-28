import type { ArticleStatus, InsightStatus, SourceStatus, TopicStatus } from './types'

export interface StatusToken {
  className: string
  label: string
}

// Article statuses
const ARTICLE_TOKENS: Record<ArticleStatus, StatusToken> = {
  discovered: { className: 'status-discovered', label: 'Discovered' },
  fetched:    { className: 'status-fetched',    label: 'Gathered'   },
  processed:  { className: 'status-processed',  label: 'Analysed'   },
  archived:   { className: 'status-archived',   label: 'Archived'   },
  paywalled:  { className: 'status-paywalled',  label: 'Paywalled'  },
  failed:     { className: 'status-failed',     label: 'Failed'     },
}

// Insight statuses
const INSIGHT_TOKENS: Record<InsightStatus, StatusToken> = {
  extracted: { className: 'status-extracted', label: 'Extracted' },
  curated:   { className: 'status-curated',   label: 'Curated'   },
  dismissed: { className: 'status-dismissed', label: 'Dismissed' },
}

// Source statuses
const SOURCE_TOKENS: Record<SourceStatus, StatusToken> = {
  active:  { className: 'status-active',   label: 'Active'  },
  paused:  { className: 'status-paused',   label: 'Paused'  },
  removed: { className: 'status-removed',  label: 'Removed' },
}

// Topic statuses
const TOPIC_TOKENS: Record<TopicStatus, StatusToken> = {
  active:   { className: 'status-active',          label: 'Active'   },
  archived: { className: 'status-archived',         label: 'Archived' },
}

const ALL_TOKENS: Record<string, StatusToken> = {
  ...ARTICLE_TOKENS,
  ...INSIGHT_TOKENS,
  ...SOURCE_TOKENS,
  ...TOPIC_TOKENS,
}

export function getStatusToken(status: string): StatusToken {
  return ALL_TOKENS[status] ?? { className: 'status-unknown', label: status }
}

export { ARTICLE_TOKENS, INSIGHT_TOKENS, SOURCE_TOKENS, TOPIC_TOKENS }
