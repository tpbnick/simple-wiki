import { describe, expect, it } from 'vitest'
import { resolveReadingPrefs } from '$lib/reading-prefs.js'

describe('resolveReadingPrefs', () => {
  it('uses defaults when cookies are missing', () => {
    const prefs = resolveReadingPrefs({ get: () => undefined })
    expect(prefs.fontId).toBe('atkinson')
    expect(prefs.sizeId).toBe('medium')
    expect(prefs.readingWidth).toBe(70)
  })

  it('reads saved cookie values', () => {
    const prefs = resolveReadingPrefs({
      get(name) {
        if (name === 'wiki-font') return 'roboto'
        if (name === 'wiki-font-size') return 'large'
        if (name === 'wiki-width') return '90'
        return undefined
      }
    })

    expect(prefs.fontStack).toContain('Roboto')
    expect(prefs.fontSize).toBe('18px')
    expect(prefs.readingWidth).toBe(90)
  })
})
