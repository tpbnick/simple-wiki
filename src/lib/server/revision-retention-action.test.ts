import { describe, expect, it } from 'vitest'
import { applyRevisionRetentionFromForm } from '$lib/server/revision-retention-action.js'
import { getRevisionRetentionLimit } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-retention-action-')

describe('applyRevisionRetentionFromForm', () => {
  it('clears the retention limit when the field is blank', () => {
    const formData = new FormData()
    formData.set('revisionRetention', '')

    const result = applyRevisionRetentionFromForm(formData, { tab: 'recent' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toMatchObject({
      tab: 'recent',
      retentionUpdated: true,
      revisionRetention: null,
      prunedCount: 0
    })
    expect(getRevisionRetentionLimit()).toBeNull()
  })

  it('stores a positive limit and prunes existing revisions', () => {
    const formData = new FormData()
    formData.set('revisionRetention', '3')

    const result = applyRevisionRetentionFromForm(formData)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toMatchObject({
      retentionUpdated: true,
      revisionRetention: 3
    })
    expect(getRevisionRetentionLimit()).toBe(3)
  })
})
