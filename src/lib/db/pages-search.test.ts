import { describe, expect, it } from 'vitest'
import { savePage, searchContentPageSummaries, countContentPages } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-pages-search-')

describe('searchContentPageSummaries', () => {
  it('excludes template pages and supports search', () => {
    const baseline = countContentPages()

    savePage('alpha-page', 'Alpha Article', 'content', 'article', 'create')
    savePage('beta-page', 'Beta Article', 'content', 'article', 'create')
    savePage('tmpl-x', 'Template X', 'body', 'template', 'create')

    expect(countContentPages()).toBe(baseline + 2)

    const filtered = searchContentPageSummaries({ query: 'alpha' })
    expect(filtered.total).toBe(1)
    expect(filtered.pages[0]?.slug).toBe('alpha-page')
  })

  it('treats LIKE metacharacters in admin search literally', () => {
    savePage('hundred-percent', '100% Complete', 'content', 'article', 'create')
    savePage('other-page', 'Other', 'content', 'article', 'create')

    const literal = searchContentPageSummaries({ query: '100%' })
    expect(literal.pages.some((p) => p.slug === 'hundred-percent')).toBe(true)
    expect(literal.pages.some((p) => p.slug === 'other-page')).toBe(false)
  })

  it('paginates results', () => {
    for (let index = 0; index < 5; index++) {
      savePage(`page-${index}`, `Page ${index}`, 'content', 'article', 'create')
    }

    const firstPage = searchContentPageSummaries({ limit: 2, offset: 0 })
    const secondPage = searchContentPageSummaries({ limit: 2, offset: 2 })

    expect(firstPage.pages).toHaveLength(2)
    expect(secondPage.pages).toHaveLength(2)
    expect(firstPage.pages[0]?.slug).not.toBe(secondPage.pages[0]?.slug)
  })
})
