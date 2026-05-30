import { fail } from '@sveltejs/kit'
import { pruneAllRevisions, setRevisionRetentionLimit } from '$lib/db/index.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'

export interface RevisionRetentionActionResult {
  tab?: string
  retentionUpdated: true
  revisionRetention: number | null
  prunedCount: number
}

export interface RevisionRetentionActionFailure {
  tab?: string
  retentionError: string
}

/** Parses a retention form submission and applies the configured limit. */
export function applyRevisionRetentionFromForm(
  formData: FormData,
  options: { tab?: string } = {}
):
  | { ok: true; data: RevisionRetentionActionResult }
  | { ok: false; data: RevisionRetentionActionFailure } {
  const raw = String(formData.get('revisionRetention') ?? '').trim()
  const tab = options.tab

  if (raw === '') {
    setRevisionRetentionLimit(null)
    return {
      ok: true,
      data: {
        tab,
        retentionUpdated: true,
        revisionRetention: null,
        prunedCount: 0
      }
    }
  }

  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 1) {
    return {
      ok: false,
      data: {
        tab,
        retentionError: 'Enter a positive whole number, or leave blank to keep all revisions'
      }
    }
  }

  setRevisionRetentionLimit(limit)
  const prunedCount = pruneAllRevisions(limit)

  return {
    ok: true,
    data: {
      tab,
      retentionUpdated: true,
      revisionRetention: limit,
      prunedCount
    }
  }
}

/** Rate-limits and applies a revision retention form submission. */
export function handleRevisionRetentionAction(
  formData: FormData,
  locals: App.Locals,
  getClientAddress: () => string,
  options: { tab?: string } = {}
) {
  const rateLimited = enforceFormWriteRateLimit(locals, getClientAddress, 'revision-retention', {
    field: 'retentionError',
    tab: options.tab
  })
  if (rateLimited) return rateLimited

  const result = applyRevisionRetentionFromForm(formData, { tab: options.tab })
  if (!result.ok) return fail(400, result.data)
  return result.data
}
