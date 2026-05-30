import { openDatabase } from './connection.js'

export const REVISION_RETENTION_META_KEY = 'revision_retention_limit'

/** Returns the configured revision retention limit, or null for unlimited. */
export function getRevisionRetentionLimit(): number | null {
  const raw = openDatabase().statements.getAppMeta.get(REVISION_RETENTION_META_KEY)?.value
  if (raw == null || raw === '') return null

  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 1) return null

  return limit
}

/** Sets the revision retention limit. Pass null to keep unlimited history. */
export function setRevisionRetentionLimit(limit: number | null): void {
  const { statements } = openDatabase()

  if (limit == null) {
    statements.deleteAppMeta.run(REVISION_RETENTION_META_KEY)
    return
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Revision retention limit must be a positive integer')
  }

  statements.setAppMeta.run(REVISION_RETENTION_META_KEY, String(limit))
}
