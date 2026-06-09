export const READING_WIDTH_OPTIONS = [70, 80, 90, 100] as const
export const READING_WIDTH_MIN = READING_WIDTH_OPTIONS[0]
export const READING_WIDTH_MAX = READING_WIDTH_OPTIONS[READING_WIDTH_OPTIONS.length - 1]
export const READING_WIDTH_STEP = 10
export const DEFAULT_READING_WIDTH = READING_WIDTH_MAX

export type ReadingWidth = (typeof READING_WIDTH_OPTIONS)[number]

/** Snaps a width percentage to one of the four allowed reader widths. */
export function normalizeReadingWidth(value: number): ReadingWidth {
  if (!Number.isFinite(value)) return DEFAULT_READING_WIDTH

  let closest: ReadingWidth = READING_WIDTH_OPTIONS[0]
  let closestDistance = Math.abs(value - closest)

  for (const option of READING_WIDTH_OPTIONS) {
    const distance = Math.abs(value - option)
    if (distance < closestDistance) {
      closest = option
      closestDistance = distance
    }
  }

  return closest
}

export function readingWidthIndex(value: number): number {
  const normalized = normalizeReadingWidth(value)
  return READING_WIDTH_OPTIONS.indexOf(normalized)
}

/** Reads saved width from cookies. */
export function readingWidthFromCookies(widthCookie: string | undefined): ReadingWidth {
  if (widthCookie) return normalizeReadingWidth(Number(widthCookie))
  return DEFAULT_READING_WIDTH
}
