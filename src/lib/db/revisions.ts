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

/** Page content and title after a revision edit (the end state shown in history diffs). */
export function getRevisionPostEditSnapshot(
  revisionId: number
): { pageId: number; content: string; title: string } | null {
  const row = openDatabase().statements.getRevisionPostEdit.get(revisionId)
  if (!row) return null
  return {
    pageId: row.page_id,
    content: row.post_edit_content,
    title: row.post_edit_title
  }
}

/** Restores the page to how it looked after the selected edit. */
export function restoreRevision(
  slug: string,
  revisionId: number,
  summary = 'Restored revision',
  expectedUpdatedAt?: string | null
) {
  const page = getPage(slug)
  if (!page) return null

  const snapshot = getRevisionPostEditSnapshot(revisionId)
  if (!snapshot || snapshot.pageId !== page.id) return null

  return savePage(
    slug,
    snapshot.title,
    snapshot.content,
    page.namespace,
    summary,
    expectedUpdatedAt
  )
}
