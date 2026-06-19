import { describe, expect, it } from 'vitest'
import { normalizeReferencesForRender } from './references-normalize.js'
import { renderMarkdownSync } from './index.js'
import { prepareWikiMarkdownForRender } from './prepare-for-render.js'

describe('reference edge cases', () => {
  it('does not transform references inside fenced code blocks', () => {
    const md = '```\n[^: not a reference]\n```\n\nReal.[^: Source]'
    const normalized = normalizeReferencesForRender(md)
    expect(normalized).toContain('```\n[^: not a reference]\n```')
    expect(normalized).toContain('[^wiki-ref-1]')
    expect(normalized).toContain('[^wiki-ref-1]: Source')
  })

  it('does not transform references inside inline code', () => {
    const normalized = normalizeReferencesForRender('Use `[^: example]` syntax. Real.[^: Source]')
    expect(normalized).toContain('`[^: example]`')
    expect(normalized).toContain('[^wiki-ref-1]: Source')
  })

  it('handles extra anonymous markers without definitions', () => {
    const html = renderMarkdownSync(normalizeReferencesForRender('A.[^] B.[^]\n\n[^]: only one'))
    expect(html).toContain('data-footnote-ref')
    expect(html).toContain('only one')
  })

  it('works through prepareWikiMarkdownForRender', () => {
    const html = renderMarkdownSync(prepareWikiMarkdownForRender('Claim.[^: A source]'))
    expect(html).toContain('class="footnotes"')
    expect(html).toContain('A source')
  })
})
