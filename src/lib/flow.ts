import type { ArticleStatus, InsightStatus } from './types'

type Role = 'researcher' | 'reader'

interface Transition<TStatus extends string> {
  from: TStatus
  to: TStatus
  action: string
  allowedRoles: Role[]
}

interface FlowTypeDefinition<TStatus extends string> {
  flowType: string
  transitions: Transition<TStatus>[]
}

export const articleIngestionFlow: FlowTypeDefinition<ArticleStatus> = {
  flowType: 'article-ingestion',
  transitions: [
    // gather creates articles in 'discovered' — no from state, handled separately
    { from: 'discovered', to: 'fetched',    action: 'fetch',         allowedRoles: ['researcher'] },
    { from: 'discovered', to: 'paywalled',  action: 'markPaywalled', allowedRoles: ['researcher'] },
    { from: 'discovered', to: 'failed',     action: 'markFailed',    allowedRoles: ['researcher'] },
    { from: 'fetched',    to: 'processed',  action: 'process',       allowedRoles: ['researcher'] },
    { from: 'fetched',    to: 'paywalled',  action: 'markPaywalled', allowedRoles: ['researcher'] },
    { from: 'fetched',    to: 'failed',     action: 'markFailed',    allowedRoles: ['researcher'] },
    { from: 'processed',  to: 'archived',   action: 'archive',       allowedRoles: ['researcher'] },
  ],
}

export const insightCurationFlow: FlowTypeDefinition<InsightStatus> = {
  flowType: 'insight-curation',
  transitions: [
    { from: 'extracted', to: 'curated',   action: 'curate',  allowedRoles: ['researcher'] },
    { from: 'extracted', to: 'dismissed', action: 'dismiss', allowedRoles: ['researcher'] },
  ],
}

export function validateTransition<TStatus extends string>(
  flow: FlowTypeDefinition<TStatus>,
  from: TStatus,
  action: string,
  role: Role,
): { valid: true; to: TStatus } | { valid: false; reason: string } {
  const transition = flow.transitions.find(t => t.from === from && t.action === action)

  if (!transition) {
    return { valid: false, reason: `No transition '${action}' from state '${from}'` }
  }
  if (!transition.allowedRoles.includes(role)) {
    return { valid: false, reason: `Role '${role}' cannot perform '${action}'` }
  }
  return { valid: true, to: transition.to }
}
