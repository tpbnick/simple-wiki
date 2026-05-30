import { describe, expect, it } from 'vitest'
import { escapeHtml } from '$lib/html.js'
import { sanitizeSearchSnippet } from '$lib/search-snippet.js'
import { safeRedirectPath } from '$lib/safe-redirect.js'
import { slugify, titleFromSlug } from '$lib/slug.js'
import {
  createDefaultInfobox,
  findInfoboxInContent,
  replaceInfoboxInContent
} from '$lib/templates/infobox-editor.js'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>"&"</script>')).toBe(
      '&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;'
    )
  })
})

describe('sanitizeSearchSnippet', () => {
  it('preserves mark tags while escaping HTML', () => {
    expect(sanitizeSearchSnippet('Hello <mark>world</mark> <img onerror=alert(1)>')).toBe(
      'Hello <mark>world</mark> &lt;img onerror=alert(1)&gt;'
    )
  })

  it('strips wiki template markup from snippets', () => {
    expect(
      sanitizeSearchSnippet(
        '{{Infobox|title=Fischbach|@img0=/uploads/fischbach_0910f2a3.png|@img1_cap=Coat'
      )
    ).toBe('')
  })

  it('strips templates while preserving highlighted prose', () => {
    expect(
      sanitizeSearchSnippet(
        'Overview of <mark>Fisch</mark>bach {{Infobox|title=Fischbach|@img0=/uploads/long-file-name.png}}'
      )
    ).toBe('Overview of <mark>Fisch</mark>bach')
  })
})

describe('safeRedirectPath', () => {
  it('allows safe internal paths', () => {
    expect(safeRedirectPath('/wiki/home')).toBe('/wiki/home')
  })

  it('allows percent-encoded path segments', () => {
    expect(safeRedirectPath('/wiki/caf%C3%A9')).toBe('/wiki/caf%C3%A9')
    expect(safeRedirectPath('/wiki/new%20page')).toBe('/wiki/new%20page')
  })

  it('blocks open redirects', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/')
    expect(safeRedirectPath('/\\evil.com')).toBe('/')
    expect(safeRedirectPath('/wiki/../admin')).toBe('/')
  })
})

describe('slugify', () => {
  it('creates URL-safe slugs', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
  })
})

describe('titleFromSlug', () => {
  it('derives a readable title from a slug', () => {
    expect(titleFromSlug('fischbach-bei-dahn')).toBe('Fischbach Bei Dahn')
  })
})

describe('infobox markdown', () => {
  it('round-trips infobox data', () => {
    const data = createDefaultInfobox()
    data.title = 'France'
    const markdown = replaceInfoboxInContent('', data)
    const match = findInfoboxInContent(markdown)
    expect(match?.data.title).toBe('France')
    expect(match?.data.entries.length).toBeGreaterThan(0)
  })
})
