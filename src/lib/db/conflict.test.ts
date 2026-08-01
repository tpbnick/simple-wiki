import { describe, expect, it } from 'vitest'
import {
  getPage,
  PageConflictError,
  ProtectedPageError,
  savePage,
  deletePage
} from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-conflict-test-')

describe('savePage conflict detection', () => {
  it('saves a new page without an expected timestamp', () => {
    const page = savePage('test-page', 'Test Page', 'Hello', 'article', 'create')
    expect(page.slug).toBe('test-page')
    expect(page.content).toBe('Hello')
  })

  it('throws PageConflictError when expectedUpdatedAt is stale', () => {
    savePage('conflict-page', 'Conflict', 'Version 1', 'article', 'create')
    savePage('conflict-page', 'Conflict', 'Version 2', 'article', 'edit')

    expect(() =>
      savePage('conflict-page', 'Conflict', 'Version 3', 'article', 'edit', '2000-01-01 00:00:00')
    ).toThrow(PageConflictError)

    expect(getPage('conflict-page')?.content).toBe('Version 2')
  })

  it('allows save when expectedUpdatedAt matches the current page', () => {
    const page = savePage('fresh-page', 'Fresh', 'Draft', 'article', 'create')

    const updated = savePage('fresh-page', 'Fresh', 'Draft v2', 'article', 'edit', page.updated_at)

    expect(updated.content).toBe('Draft v2')
  })

  it('stores millisecond precision on update', () => {
    const page = savePage('rapid-page', 'Rapid', 'v1', 'article', 'create')
    const updated = savePage('rapid-page', 'Rapid', 'v2', 'article', 'edit', page.updated_at)
    expect(updated.updated_at).toMatch(/\.\d{3}/)
  })
})

describe('deletePage', () => {
  it('prevents deleting protected system pages', () => {
    expect(() => deletePage('home')).toThrow(ProtectedPageError)
    expect(() => deletePage('help')).toThrow(ProtectedPageError)
  })
})
