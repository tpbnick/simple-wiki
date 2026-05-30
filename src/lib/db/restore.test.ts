import { describe, expect, it } from 'vitest'
import {
  getPage,
  getRevisions,
  restoreRevision,
  savePage,
  PageConflictError
} from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-restore-test-')

describe('restoreRevision', () => {
  it('restores page content from a stored revision', () => {
    savePage('restore-test', 'Restore Test', 'version 1', 'article', 'create')
    savePage('restore-test', 'Restore Test', 'version 2', 'article', 'edit')

    const revisions = getRevisions('restore-test')
    expect(revisions.length).toBeGreaterThan(0)

    const target = revisions[revisions.length - 1]
    const restored = restoreRevision('restore-test', target.id, 'Restored revision #1')

    expect(restored?.content).toBe('version 1')
    expect(getPage('restore-test')?.content).toBe('version 1')
  })

  it('returns null for a revision that does not belong to the page', () => {
    savePage('page-a', 'A', 'a', 'article', 'create')
    savePage('page-b', 'B', 'b', 'article', 'create')
    savePage('page-b', 'B', 'b2', 'article', 'edit')

    const revision = getRevisions('page-b')[0]
    expect(restoreRevision('page-a', revision.id)).toBeNull()
  })

  it('restores large content after a short current version', () => {
    const longContent = '# Title\n\n' + 'Long body paragraph. '.repeat(200)
    savePage('long-page', 'Long', longContent, 'article', 'create')
    savePage('long-page', 'Long', 'short', 'article', 'trim')

    const revision = getRevisions('long-page').find((entry) => entry.content.length > 100)
    expect(revision).toBeTruthy()

    const restored = restoreRevision('long-page', revision!.id, 'Restored long version')
    expect(restored?.content).toBe(longContent)
  })

  it('throws PageConflictError when expectedUpdatedAt is stale', () => {
    savePage('restore-conflict', 'Restore Conflict', 'v1', 'article', 'create')
    savePage('restore-conflict', 'Restore Conflict', 'v2', 'article', 'edit')

    const revision = getRevisions('restore-conflict')[0]
    expect(() =>
      restoreRevision('restore-conflict', revision.id, 'restore', '2000-01-01 00:00:00')
    ).toThrow(PageConflictError)
    expect(getPage('restore-conflict')?.content).toBe('v2')
  })

  it('restores the title stored on the revision', () => {
    savePage('title-restore', 'Original Title', 'Body', 'article', 'create')
    savePage('title-restore', 'Renamed Title', 'Body', 'article', 'rename')

    const revision = getRevisions('title-restore')[0]
    const restored = restoreRevision('title-restore', revision.id, 'restore title')

    expect(restored?.title).toBe('Original Title')
    expect(getPage('title-restore')?.title).toBe('Original Title')
  })
})
