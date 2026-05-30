import { describe, expect, it } from 'vitest'
import {
  getRecentRevisions,
  getRevisionDiff,
  getRevisionRetentionLimit,
  getRevisions,
  pruneAllRevisions,
  savePage,
  setRevisionRetentionLimit
} from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-revision-retention-')

describe('revision retention settings', () => {
  it('defaults to unlimited retention', () => {
    expect(getRevisionRetentionLimit()).toBeNull()
  })

  it('stores and clears a retention limit', () => {
    setRevisionRetentionLimit(25)
    expect(getRevisionRetentionLimit()).toBe(25)

    setRevisionRetentionLimit(null)
    expect(getRevisionRetentionLimit()).toBeNull()
  })

  it('rejects invalid retention limits', () => {
    expect(() => setRevisionRetentionLimit(0)).toThrow()
    expect(() => setRevisionRetentionLimit(1.5)).toThrow()
  })
})

describe('revision retention pruning', () => {
  it('keeps only the newest revisions per page after saves', () => {
    setRevisionRetentionLimit(2)

    savePage('retention-page', 'Retention', 'v1', 'article', 'create')
    savePage('retention-page', 'Retention', 'v2', 'article', 'edit 1')
    savePage('retention-page', 'Retention', 'v3', 'article', 'edit 2')
    savePage('retention-page', 'Retention', 'v4', 'article', 'edit 3')

    const revisions = getRevisions('retention-page')
    expect(revisions).toHaveLength(2)
    expect(revisions[0].content).toBe('v3')
    expect(revisions[1].content).toBe('v2')
  })

  it('prunes all pages when the limit is lowered', () => {
    savePage('page-a', 'A', 'a1', 'article', 'create')
    savePage('page-a', 'A', 'a2', 'article', 'edit')
    savePage('page-a', 'A', 'a3', 'article', 'edit')
    savePage('page-b', 'B', 'b1', 'article', 'create')
    savePage('page-b', 'B', 'b2', 'article', 'edit')
    savePage('page-b', 'B', 'b3', 'article', 'edit')

    setRevisionRetentionLimit(1)
    const prunedCount = pruneAllRevisions(1)

    expect(prunedCount).toBeGreaterThan(0)
    expect(getRevisions('page-a')).toHaveLength(1)
    expect(getRevisions('page-b')).toHaveLength(1)
  })
})

describe('getRevisionDiff', () => {
  it('returns line changes for a stored revision', () => {
    savePage('diff-page', 'Diff Page', 'alpha\nbeta', 'article', 'create')
    savePage('diff-page', 'Diff Page', 'alpha\ndelta', 'article', 'edit beta to delta')

    const revisions = getRevisions('diff-page')
    const diff = getRevisionDiff(revisions[0].id)

    expect(diff?.lines).toEqual([
      { type: 'remove', text: 'beta' },
      { type: 'add', text: 'delta' }
    ])
  })

  it('returns null for an unknown revision id', () => {
    expect(getRevisionDiff(999_999)).toBeNull()
  })

  it('does not create a revision when page content and title are unchanged', () => {
    savePage('empty-save-page', 'Empty Save', 'same content', 'article', 'create')
    savePage('empty-save-page', 'Empty Save', 'same content', 'article', 'no-op save')

    expect(getRevisions('empty-save-page')).toHaveLength(0)
  })

  it('creates a revision when only the title changes', () => {
    savePage('title-page', 'Original Title', 'Body text', 'article', 'create')
    savePage('title-page', 'Renamed Title', 'Body text', 'article', 'rename')

    const revisions = getRevisions('title-page')
    expect(revisions).toHaveLength(1)
    expect(revisions[0].title).toBe('Original Title')
    expect(revisions[0].content).toBe('Body text')
  })
})

describe('getRecentRevisions', () => {
  it('returns recent edits newest first', () => {
    setRevisionRetentionLimit(null)

    savePage('recent-a', 'Recent A', 'a1', 'article', 'create')
    savePage('recent-b', 'Recent B', 'b1', 'article', 'create')
    savePage('recent-a', 'Recent A', 'a2', 'article', 'updated A')
    savePage('recent-b', 'Recent B', 'b2', 'article', 'updated B')

    const changes = getRecentRevisions(10)
    expect(changes.length).toBeGreaterThanOrEqual(2)
    expect(changes[0].slug).toBe('recent-b')
    expect(changes[0].summary).toBe('updated B')
    expect(changes[1].slug).toBe('recent-a')
  })
})
