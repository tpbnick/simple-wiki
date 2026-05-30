import { describe, expect, it } from 'vitest'
import { sanitizeWikiHtml } from '$lib/markdown/sanitize-html.js'

describe('sanitizeWikiHtml', () => {
  it('strips script tags injected after the main render pipeline', () => {
    const html = '<p>Hello</p><script>alert(1)</script>'
    expect(sanitizeWikiHtml(html)).not.toContain('<script')
    expect(sanitizeWikiHtml(html)).toContain('Hello')
  })

  it('strips data-tree from arbitrary divs to block injected family-tree payloads', () => {
    const html =
      '<div class="not-a-tree" data-family="evil" data-tree="payload">Injected</div>'
    const sanitized = sanitizeWikiHtml(html)
    expect(sanitized).not.toContain('data-tree')
    expect(sanitized).not.toContain('dataTree')
  })
})
