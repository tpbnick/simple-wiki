import { buildChangedLineDiff } from '$lib/diff/lines.js'
import { openDatabase } from './connection.js'
import { getPage, savePage } from './pages.js'
import type { RecentChange, Revision } from './types.js'

export type RevisionDiffLine = { type: 'add' | 'remove'; text: string }

/** Returns revision history for a page, newest first. */
export function getRevisions(slug: string): Revision[] {
  return openDatabase().statements.getRevisions.all(slug)
}

/** Returns a single revision by ID, or null when it does not exist. */
function getRevisionById(revisionId: number): Revision | null {
  return openDatabase().statements.getRevisionById.get(revisionId) ?? null
}

/** Returns added/removed lines for a revision edit, or null when the revision does not exist. */
export function getRevisionDiff(
  revisionId: number
): { lines: RevisionDiffLine[]; tooLarge?: boolean } | null {
  const context = openDatabase().statements.getRevisionDiffContext.get(revisionId)
  if (!context) return null

  const newerContent = context.next_revision_content ?? context.page_content ?? ''
  return buildChangedLineDiff(context.old_content ?? '', newerContent)
}

/** Returns recent edits across the wiki, newest first. */
export function getRecentRevisions(limit = 50): RecentChange[] {
  return openDatabase().statements.getRecentRevisions.all(limit)
}

/** Deletes revisions beyond the newest `limit` rows for every page. Returns rows removed. */
export function pruneAllRevisions(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) return 0
  return openDatabase().statements.pruneRevisionsOverLimit.run(limit).changes
}

/** Restores a page to a previous revision. */
export function restoreRevision(
  slug: string,
  revisionId: number,
  summary = 'Restored revision',
  expectedUpdatedAt?: string | null
) {
  const page = getPage(slug)
  if (!page) return null

  const revision = getRevisionById(revisionId)
  if (!revision || revision.page_id !== page.id) return null

  return savePage(
    slug,
    revision.title ?? page.title,
    revision.content,
    page.namespace,
    summary,
    expectedUpdatedAt
  )
}
