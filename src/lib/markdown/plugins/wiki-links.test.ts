import { describe, expect, it } from 'vitest'
import { renderMarkdownSync } from '../index.js'

describe('remarkWikiLinks', () => {
  it('marks links to missing pages with the redlink class', () => {
    const html = renderMarkdownSync('See [[Missing Page]] and [[Home]].', {
      wikiLinks: { existingPages: new Set(['home']) }
    })

    expect(html).toContain('class="redlink"')
    expect(html).toContain('href="/wiki/missing-page?title=Missing%20Page"')
    expect(html).toContain('href="/wiki/home"')
    expect(html).not.toMatch(/href="\/wiki\/home"[^>]*class="redlink"/)
  })

  it('treats all pages as existing when existingPages is omitted', () => {
    const html = renderMarkdownSync('See [[Missing Page]].', { wikiLinks: {} })

    expect(html).not.toContain('redlink')
  })
})
