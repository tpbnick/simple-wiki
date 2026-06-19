import { describe, expect, it } from 'vitest'
import { renderMarkdownSync } from './index.js'
import { sanitizeWikiHtml } from './sanitize-html.js'

describe('GFM footnotes / references', () => {
  it('renders inline markers linking to a References section', () => {
    const html = renderMarkdownSync(
      'Published in 1905.[^1] Later work followed.[^2]\n\n[^1]: [On the Electrodynamics of Moving Bodies](https://example.com)\n[^2]: Plain text source.'
    )

    expect(html).toContain('data-footnote-ref')
    expect(html).toContain('href="#user-content-fn-1"')
    expect(html).toContain('href="#user-content-fn-2"')
    expect(html).toContain('class="footnotes"')
    expect(html).toContain('https://example.com')
    expect(html).toContain('Plain text source.')
  })

  it('processes wiki links inside reference definitions', () => {
    const html = renderMarkdownSync('See topic.[^1]\n\n[^1]: See also [[General Relativity]].', {
      wikiLinks: { existingPages: new Set(['general-relativity']) }
    })

    expect(html).toContain('href="/wiki/general-relativity"')
    expect(html).toContain('class="footnotes"')
  })

  it('omits the References section when no references exist', () => {
    const html = renderMarkdownSync('No references here.')

    expect(html).not.toContain('class="footnotes"')
  })

  it('keeps footnote markup through post-render sanitization', () => {
    const html = renderMarkdownSync('Cited.[^1]\n\n[^1]: A source.')
    const sanitized = sanitizeWikiHtml(html)

    expect(sanitized).toContain('class="footnotes"')
    expect(sanitized).toContain('data-footnote-backref')
    expect(sanitized).toContain('A source.')
  })

  it('numbers footnotes by first appearance, not label id', () => {
    const html = renderMarkdownSync('First[^5] second[^2]\n\n[^5]: Fifth id\n[^2]: Second id')
    expect(html.indexOf('Fifth id')).toBeLessThan(html.indexOf('Second id'))
    expect(html).toContain('data-footnote-ref')
  })
})
