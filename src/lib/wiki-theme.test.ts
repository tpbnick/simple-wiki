import { resolveWikiTheme } from '$lib/wiki-theme.js'
import { applyReadingPrefsHtmlShell, buildReadingPrefsCss } from '$lib/reading-prefs.js'
import { describe, expect, it } from 'vitest'
import { applyWikiHtmlShell, buildCriticalThemeCss } from '$lib/wiki-theme.js'

describe('resolveWikiTheme', () => {
  it('defaults to light and accepts dark', () => {
    expect(resolveWikiTheme(undefined)).toBe('wiki-light')
    expect(resolveWikiTheme('wiki-dark')).toBe('wiki-dark')
  })
})

describe('applyWikiHtmlShell', () => {
  it('replaces theme placeholders in the html shell', () => {
    const html = '<html data-theme="%wiki.theme%"><meta name="theme-color" content="%wiki.theme-color%" /><style>%wiki.critical-theme-css%</style>'
    const out = applyWikiHtmlShell(html, 'wiki-dark')

    expect(out).toContain('data-theme="wiki-dark"')
    expect(out).toContain('content="#1c1f27"')
    expect(out).toContain('--color-base-100:#13151a')
    expect(out).not.toContain('%wiki.')
  })
})

describe('buildCriticalThemeCss', () => {
  it('includes both themes', () => {
    const css = buildCriticalThemeCss()
    expect(css).toContain("html[data-theme='wiki-light']")
    expect(css).toContain("html[data-theme='wiki-dark']")
  })
})

describe('applyReadingPrefsHtmlShell', () => {
  it('replaces reading preference css placeholders', () => {
    const html = '<style>%wiki.reading-prefs-css%</style>'
    const out = applyReadingPrefsHtmlShell(html, {
      get(name) {
        if (name === 'wiki-font') return 'roboto'
        if (name === 'wiki-font-size') return 'large'
        if (name === 'wiki-width') return '90'
        return undefined
      }
    })

    expect(out).toContain('--reading-font:')
    expect(out).toContain('Roboto')
    expect(out).toContain('--reading-font-size:18px')
    expect(out).toContain('--reading-width:90%')
  })
})

describe('buildReadingPrefsCss', () => {
  it('falls back to defaults when cookies are missing', () => {
    const css = buildReadingPrefsCss({ get: () => undefined })
    expect(css).toContain('Atkinson Hyperlegible')
    expect(css).toContain('--reading-font-size:16px')
    expect(css).toContain('--reading-width:70%')
  })
})
