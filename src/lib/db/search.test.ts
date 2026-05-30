import { describe, expect, it } from 'vitest'
import {
  savePage,
  searchPageSuggestions,
  searchPages
} from '$lib/db/index.js'
import { MIN_SEARCH_SUGGESTION_LENGTH } from '$lib/db/search.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-search-test-')

describe('searchPages', () => {
  it('returns article pages but excludes templates', () => {
    savePage('apple-pie', 'Apple Pie', 'A delicious dessert with apples', 'article', 'create')
    savePage('infobox', 'Infobox Template', 'Template for infoboxes {{param}}', 'template', 'create')

    const results = searchPages('apple', 10)
    expect(results.some((r) => r.slug === 'apple-pie')).toBe(true)
    expect(results.some((r) => r.slug === 'infobox')).toBe(false)
  })
})

describe('searchPageSuggestions', () => {
  it('returns nothing before the minimum query length', () => {
    savePage('banana-bread', 'Banana Bread', 'Quick bread recipe', 'article', 'create')

    const short = 'b'.repeat(MIN_SEARCH_SUGGESTION_LENGTH - 1)
    expect(searchPageSuggestions(short, 8)).toEqual([])
  })

  it('returns slug and title matches after the minimum query length', () => {
    savePage('banana-bread', 'Banana Bread', 'Quick bread recipe', 'article', 'create')
    savePage('sidebar', 'Sidebar Template', 'Navigation sidebar', 'template', 'create')

    const results = searchPageSuggestions('bana', 8)
    expect(results).toEqual([{ slug: 'banana-bread', title: 'Banana Bread' }])
  })
})
