import { describe, expect, it } from 'vitest'
import { normalizeReferencesForRender } from './references-normalize.js'
import { renderMarkdownSync } from './index.js'

function renderPrepared(content: string): string {
  return renderMarkdownSync(normalizeReferencesForRender(content))
}

describe('normalizeReferencesForRender', () => {
  it('expands self-contained inline references in document order', () => {
    expect(normalizeReferencesForRender('First.[^: One] Second.[^: Two]')).toBe(
      'First.[^wiki-ref-1] Second.[^wiki-ref-2]\n\n[^wiki-ref-1]: One\n[^wiki-ref-2]: Two'
    )
  })

  it('pairs anonymous markers with bottom definitions in order', () => {
    expect(normalizeReferencesForRender('First.[^] Second.[^]\n\n[^]: One\n[^]: Two')).toBe(
      'First.[^wiki-ref-1] Second.[^wiki-ref-2]\n\n[^wiki-ref-1]: One\n[^wiki-ref-2]: Two'
    )
  })

  it('keeps legacy explicit ids without renumbering labels', () => {
    expect(normalizeReferencesForRender('Text.[^note]\n\n[^note]: A source')).toBe(
      'Text.[^note]\n\n[^note]: A source'
    )
  })

  it('adds missing inline markers for legacy orphan definitions', () => {
    expect(normalizeReferencesForRender('[^1]: test')).toBe('[^1]\n\n[^1]: test')
  })
})

describe('references rendering after normalization', () => {
  it('renders self-contained inline references', () => {
    const html = renderPrepared('Published in 1905.[^: [Paper](https://example.com)]')
    expect(html).toContain('data-footnote-ref')
    expect(html).toContain('class="footnotes"')
    expect(html).toContain('https://example.com')
  })

  it('numbers references by text order when inserting between existing refs', () => {
    const html = renderPrepared('A.[^: First] NEW.[^: Inserted] B.[^: Second]')
    const first = html.indexOf('First')
    const inserted = html.indexOf('Inserted')
    const second = html.indexOf('Second')
    expect(first).toBeLessThan(inserted)
    expect(inserted).toBeLessThan(second)
  })

  it('renders anonymous marker plus bottom definition form', () => {
    const html = renderPrepared('Claim.[^]\n\n[^]: Plain text source.')
    expect(html).toContain('data-footnote-ref')
    expect(html).toContain('Plain text source.')
  })

  it('renders wiki links inside normalized definitions', () => {
    const html = renderPrepared('See topic.[^: [[Home]]]')
    expect(html).toContain('href="/wiki/home"')
  })
})
