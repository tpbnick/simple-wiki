import { describe, expect, it } from 'vitest'
import {
  DEFAULT_READING_WIDTH,
  normalizeReadingWidth,
  readingWidthFromCookies,
  readingWidthIndex
} from './reading-width.js'

describe('normalizeReadingWidth', () => {
  it('snaps values to the four allowed widths', () => {
    expect(normalizeReadingWidth(70)).toBe(70)
    expect(normalizeReadingWidth(74)).toBe(70)
    expect(normalizeReadingWidth(76)).toBe(80)
    expect(normalizeReadingWidth(95)).toBe(90)
    expect(normalizeReadingWidth(150)).toBe(100)
    expect(normalizeReadingWidth(10)).toBe(70)
  })

  it('falls back to the default for invalid values', () => {
    expect(normalizeReadingWidth(Number.NaN)).toBe(DEFAULT_READING_WIDTH)
  })
})

describe('readingWidthIndex', () => {
  it('maps each width to its slider index', () => {
    expect(readingWidthIndex(70)).toBe(0)
    expect(readingWidthIndex(80)).toBe(1)
    expect(readingWidthIndex(90)).toBe(2)
    expect(readingWidthIndex(100)).toBe(3)
  })
})

describe('readingWidthFromCookies', () => {
  it('uses the width cookie when present', () => {
    expect(readingWidthFromCookies('86')).toBe(90)
  })

  it('falls back to the default when no cookie is set', () => {
    expect(readingWidthFromCookies(undefined)).toBe(DEFAULT_READING_WIDTH)
  })

  it('clamps narrow widths up to the minimum', () => {
    expect(readingWidthFromCookies('40')).toBe(70)
  })
})
