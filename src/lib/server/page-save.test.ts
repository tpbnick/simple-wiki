import { describe, expect, it } from 'vitest'
import {
  persistWikiPage,
  validatePageSaveFields,
  MAX_PAGE_CONTENT_BYTES
} from '$lib/server/page-save.js'
import { getPage, savePage } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-page-save-')

describe('validatePageSaveFields', () => {
  it('requires a title', () => {
    expect(
      validatePageSaveFields({
        title: '   ',
        content: 'body',
        namespace: 'article',
        summary: '',
        expectedUpdatedAt: null
      })
    ).toEqual({ status: 422, message: 'Title is required' })
  })

  it('rejects content over 2 MB', () => {
    const oversized = 'x'.repeat(MAX_PAGE_CONTENT_BYTES + 1)
    expect(
      validatePageSaveFields({
        title: 'Big',
        content: oversized,
        namespace: 'article',
        summary: '',
        expectedUpdatedAt: null
      })
    ).toEqual({ status: 413, message: 'Page content exceeds 2 MB limit' })
  })
})

describe('persistWikiPage', () => {
  it('creates a new page from the new route slug', () => {
    const result = persistWikiPage({
      routeSlug: 'new',
      fields: {
        title: 'Created Page',
        content: 'hello',
        namespace: 'article',
        summary: 'create',
        expectedUpdatedAt: null
      }
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.slug).toBe('created-page')
    expect(getPage(result.slug)?.content).toBe('hello')
  })

  it('returns duplicate when create races an existing slug', () => {
    savePage('race-page', 'Race Page', 'first', 'article', 'create')

    const result = persistWikiPage({
      routeSlug: 'new',
      fields: {
        title: 'Race Page',
        content: 'second',
        namespace: 'article',
        summary: 'create',
        expectedUpdatedAt: null
      }
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.type).toBe('duplicate')
    expect(getPage('race-page')?.content).toBe('first')
  })

  it('returns a conflict result when expectedUpdatedAt is stale', () => {
    savePage('conflict-page', 'Conflict', 'v1', 'article', 'create')
    savePage('conflict-page', 'Conflict', 'v2', 'article', 'edit')

    const result = persistWikiPage({
      routeSlug: 'conflict-page',
      fields: {
        title: 'Conflict',
        content: 'v3',
        namespace: 'article',
        summary: 'edit',
        expectedUpdatedAt: '2000-01-01 00:00:00'
      }
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.type).toBe('conflict')
  })

  it('requires expectedUpdatedAt for existing API updates when configured', () => {
    savePage('api-page', 'API Page', 'body', 'article', 'create')

    const result = persistWikiPage({
      routeSlug: 'api-page',
      fields: {
        title: 'API Page',
        content: 'updated',
        namespace: 'article',
        summary: '',
        expectedUpdatedAt: null
      },
      requireExpectedUpdatedWhenExisting: true
    })

    expect(result).toEqual({
      ok: false,
      type: 'validation',
      status: 400,
      message: 'expectedUpdatedAt is required when updating an existing page'
    })
  })
})
