import { describe, expect, it } from 'vitest'
import {
  expandSlidesForLoop,
  isLightboxCandidate,
  MIN_LOOP_SLIDES
} from '$lib/lightbox/wiki-lightbox.js'

describe('expandSlidesForLoop', () => {
  const slide = (src: string) => ({ src, width: 800, height: 600 })

  it('keeps three or more slides unchanged', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    const result = expandSlidesForLoop(slides, 1)
    expect(result.slides).toHaveLength(3)
    expect(result.index).toBe(1)
  })

  it('duplicates a single slide so looping works', () => {
    const slides = [slide('a')]
    const result = expandSlidesForLoop(slides, 0)
    expect(result.slides.length).toBeGreaterThanOrEqual(MIN_LOOP_SLIDES)
    expect(result.index).toBe(0)
  })

  it('duplicates two slides so looping works', () => {
    const slides = [slide('a'), slide('b')]
    const result = expandSlidesForLoop(slides, 1)
    expect(result.slides.length).toBeGreaterThanOrEqual(MIN_LOOP_SLIDES)
    expect(result.index).toBe(1)
  })
})

describe('isLightboxCandidate', () => {
  function fakeImg(options: {
    src: string
    wikiLightbox?: string
    inButton?: boolean
  }): HTMLImageElement {
    return {
      src: options.src,
      currentSrc: options.src,
      dataset: { wikiLightbox: options.wikiLightbox ?? '' },
      closest: (selector: string) => (options.inButton && selector === 'button' ? {} : null)
    } as unknown as HTMLImageElement
  }

  it('ignores images opted out of the lightbox', () => {
    expect(isLightboxCandidate(fakeImg({ src: '/uploads/test.jpg', wikiLightbox: 'off' }))).toBe(
      false
    )
  })

  it('accepts normal article images', () => {
    expect(isLightboxCandidate(fakeImg({ src: '/uploads/test.jpg' }))).toBe(true)
  })
})
