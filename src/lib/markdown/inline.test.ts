import { describe, expect, it } from 'vitest'
import { renderWikiInlineMarkdown } from '$lib/markdown/inline.js'

describe('renderWikiInlineMarkdown', () => {
  it('renders bold text', () => {
    expect(renderWikiInlineMarkdown('**Bold** caption')).toBe('<strong>Bold</strong> caption')
  })

  it('renders italic text', () => {
    expect(renderWikiInlineMarkdown('*Italic* caption')).toBe('<em>Italic</em> caption')
  })

  it('renders markdown links', () => {
    expect(renderWikiInlineMarkdown('[Wiki](https://example.com)')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer">Wiki</a>'
    )
  })

  it('renders bold inside links and links inside bold', () => {
    expect(renderWikiInlineMarkdown('**Bold [Link](https://example.com)**')).toBe(
      '<strong>Bold <a href="https://example.com" rel="noopener noreferrer">Link</a></strong>'
    )
  })

  it('renders wiki links to pages', () => {
    const existing = new Set(['john-smith'])
    expect(renderWikiInlineMarkdown('[[John Smith]]', { existingPages: existing })).toBe(
      '<a href="/wiki/john-smith">John Smith</a>'
    )
  })

  it('renders bare URLs without hanging', () => {
    expect(renderWikiInlineMarkdown('See https://example.com for details')).toBe(
      'See <a href="https://example.com" rel="noopener noreferrer">https://example.com</a> for details'
    )
  })

  it('renders bare URLs inside bold text', () => {
    expect(renderWikiInlineMarkdown('**Visit https://example.com today**')).toBe(
      '<strong>Visit <a href="https://example.com" rel="noopener noreferrer">https://example.com</a> today</strong>'
    )
  })

  it('marks missing wiki pages as red links', () => {
    expect(
      renderWikiInlineMarkdown('[[Missing Person]]', { existingPages: new Set(['home']) })
    ).toBe(
      '<a href="/wiki/missing-person?title=Missing%20Person" class="redlink">Missing Person</a>'
    )
  })
})
