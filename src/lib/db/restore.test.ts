import { describe, expect, it } from 'vitest'
import {
  getPage,
  getRevisions,
  getRevisionPostEditSnapshot,
  restoreRevision,
  savePage,
  PageConflictError
} from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-restore-test-')

describe('getRevisionPostEditSnapshot', () => {
  it('returns the post-edit content and title for a revision', () => {
    savePage('post-edit', 'Post Edit', 'version 1', 'article', 'create')
    savePage('post-edit', 'Renamed', 'version 2', 'article', 'edit')

    const revision = getRevisions('post-edit')[0]
    const snapshot = getRevisionPostEditSnapshot(revision.id)

    expect(snapshot?.content).toBe('version 2')
    expect(snapshot?.title).toBe('Renamed')
  })

  it('returns null for an unknown revision id', () => {
    expect(getRevisionPostEditSnapshot(999_999)).toBeNull()
  })
})

describe('restoreRevision', () => {
  it('restores the post-edit version shown in the history diff', () => {
    savePage('restore-test', 'Restore Test', 'version 1', 'article', 'create')
    savePage('restore-test', 'Restore Test', 'version 2', 'article', 'edit')

    const revisions = getRevisions('restore-test')
    expect(revisions.length).toBeGreaterThan(0)

    const target = revisions[revisions.length - 1]
    const restored = restoreRevision('restore-test', target.id, 'Restored revision #1')

    expect(restored?.content).toBe('version 2')
    expect(getPage('restore-test')?.content).toBe('version 2')
  })

  it('returns null for a revision that does not belong to the page', () => {
    savePage('page-a', 'A', 'a', 'article', 'create')
    savePage('page-b', 'B', 'b', 'article', 'create')
    savePage('page-b', 'B', 'b2', 'article', 'edit')

    const revision = getRevisions('page-b')[0]
    expect(restoreRevision('page-a', revision.id)).toBeNull()
  })

  it('restores the trimmed version after a shorten edit', () => {
    const longContent = '# Title\n\n' + 'Long body paragraph. '.repeat(200)
    savePage('long-page', 'Long', longContent, 'article', 'create')
    savePage('long-page', 'Long', 'short', 'article', 'trim')

    const revision = getRevisions('long-page').find((entry) => entry.content === longContent)
    expect(revision).toBeTruthy()

    const restored = restoreRevision('long-page', revision!.id, 'Restored trimmed version')
    expect(restored?.content).toBe('short')
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

  it('restores the post-edit title from a rename edit', () => {
    savePage('title-restore', 'Original Title', 'Body', 'article', 'create')
    savePage('title-restore', 'Renamed Title', 'Body', 'article', 'rename')

    const revision = getRevisions('title-restore')[0]
    const restored = restoreRevision('title-restore', revision.id, 'restore title')

    expect(restored?.title).toBe('Renamed Title')
    expect(getPage('title-restore')?.title).toBe('Renamed Title')
  })

  it('restores an intermediate version in a longer history', () => {
    savePage('chain-page', 'Chain', 'v1', 'article', 'create')
    savePage('chain-page', 'Chain', 'v2', 'article', 'edit 2')
    savePage('chain-page', 'Chain', 'v3', 'article', 'edit 3')

    const revisions = getRevisions('chain-page')
    const middleRevision = revisions[1]
    restoreRevision('chain-page', middleRevision.id, 'back to v2')

    expect(getPage('chain-page')?.content).toBe('v2')
  })
})
