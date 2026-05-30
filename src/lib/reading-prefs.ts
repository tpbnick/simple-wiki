import { FONTS, SIZES } from '$lib/reading-options.js'
import { readingWidthFromCookies, type ReadingWidth } from '$lib/reading-width.js'

export const READING_PREF_COOKIES = {
  font: 'wiki-font',
  size: 'wiki-font-size',
  width: 'wiki-width'
} as const

export interface ReadingPrefs {
  fontId: string
  fontStack: string
  sizeId: string
  fontSize: string
  readingWidth: ReadingWidth
}

type CookieReader = { get: (name: string) => string | undefined }

/** Resolves saved reading preferences from cookies (server or client). */
export function resolveReadingPrefs(cookies: CookieReader): ReadingPrefs {
  const fontId = cookies.get(READING_PREF_COOKIES.font) ?? 'atkinson'
  const sizeId = cookies.get(READING_PREF_COOKIES.size) ?? 'medium'
  const font = FONTS.find((entry) => entry.id === fontId) ?? FONTS[0]
  const size = SIZES.find((entry) => entry.id === sizeId) ?? SIZES[1]
  const readingWidth = readingWidthFromCookies(cookies.get(READING_PREF_COOKIES.width))

  return {
    fontId,
    fontStack: font.stack,
    sizeId,
    fontSize: size.value,
    readingWidth
  }
}

/** Inline CSS for reading prefs, applied before the app bundle loads. */
export function buildReadingPrefsCss(cookies: CookieReader): string {
  const prefs = resolveReadingPrefs(cookies)
  return `:root{--reading-font:${prefs.fontStack};--reading-font-size:${prefs.fontSize};--reading-width:${prefs.readingWidth}%}`
}

/** Applies reading-preference placeholders in the HTML shell. */
export function applyReadingPrefsHtmlShell(html: string, cookies: CookieReader): string {
  return html.replaceAll('%wiki.reading-prefs-css%', buildReadingPrefsCss(cookies))
}

/** Reads a cookie value from `document.cookie`. */
export function readDocumentCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1]
}

/** Cookie reader backed by `document.cookie`. */
export function documentCookieReader(): CookieReader {
  return { get: readDocumentCookie }
}
