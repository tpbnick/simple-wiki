export interface LightboxSlide {
  src: string
  width: number
  height: number
  alt?: string
}

/** Minimum slide count required for PhotoSwipe loop mode. */
export const MIN_LOOP_SLIDES = 3

/** Returns true for article images that should open in the page lightbox. */
export function isLightboxCandidate(img: HTMLImageElement): boolean {
  if (img.dataset.wikiLightbox === 'off') return false
  if (img.closest('button')) return false

  const src = img.currentSrc || img.src
  if (!src) return false

  return true
}

/** Duplicates slides so looping works even with one or two images on the page. */
export function expandSlidesForLoop(
  slides: LightboxSlide[],
  index: number
): { slides: LightboxSlide[]; index: number } {
  if (slides.length === 0) return { slides, index: 0 }
  if (slides.length >= MIN_LOOP_SLIDES) {
    return { slides, index: Math.min(Math.max(index, 0), slides.length - 1) }
  }

  const expanded: LightboxSlide[] = []
  while (expanded.length < MIN_LOOP_SLIDES) {
    expanded.push(...slides)
  }

  const safeIndex = Math.min(Math.max(index, 0), slides.length - 1)
  return { slides: expanded, index: safeIndex }
}

/** Loads image dimensions for PhotoSwipe when they are not available yet. */
export function resolveSlideData(img: HTMLImageElement): Promise<LightboxSlide> {
  const src = img.currentSrc || img.src

  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    return Promise.resolve({
      src,
      width: img.naturalWidth,
      height: img.naturalHeight,
      alt: img.alt || undefined
    })
  }

  return new Promise((resolve) => {
    const probe = new Image()
    probe.onload = () => {
      resolve({
        src,
        width: probe.naturalWidth || 1600,
        height: probe.naturalHeight || 1200,
        alt: img.alt || undefined
      })
    }
    probe.onerror = () => {
      resolve({ src, width: 1600, height: 1200, alt: img.alt || undefined })
    }
    probe.src = src
  })
}

export function collectLightboxImages(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img')).filter(isLightboxCandidate)
}
