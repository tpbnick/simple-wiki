import { FONTS, SIZES } from '$lib/reading-options.js'
import {
  DEFAULT_READING_WIDTH,
  normalizeReadingWidth,
  READING_WIDTH_OPTIONS,
  type ReadingWidth
} from '$lib/reading-width.js'
import {
  documentCookieReader,
  READING_PREF_COOKIES,
  resolveReadingPrefs
} from '$lib/reading-prefs.js'

function createSettingsStore() {
  let fontId = $state('atkinson')
  let sizeId = $state('medium')
  let readingWidth = $state<ReadingWidth>(DEFAULT_READING_WIDTH)

  function saveCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }

  return {
    get fontId() {
      return fontId
    },
    get sizeId() {
      return sizeId
    },
    get readingWidth() {
      return readingWidth
    },
    get font() {
      return FONTS.find((entry) => entry.id === fontId) ?? FONTS[0]
    },
    get size() {
      return SIZES.find((entry) => entry.id === sizeId) ?? SIZES[1]
    },

    init() {
      if (typeof document === 'undefined') return
      const prefs = resolveReadingPrefs(documentCookieReader())
      fontId = prefs.fontId
      sizeId = prefs.sizeId
      readingWidth = prefs.readingWidth
    },

    applyToDocument() {
      if (typeof document === 'undefined') return
      const el = document.documentElement
      el.classList.add('no-transition')
      el.style.setProperty('--reading-font', this.font.stack)
      el.style.setProperty('--font-sans', this.font.stack)
      el.style.setProperty('--reading-font-size', this.size.value)
      el.style.setProperty('--reading-width', `${readingWidth}%`)
      requestAnimationFrame(() => el.classList.remove('no-transition'))
    },

    setFont(id: string) {
      fontId = id
      saveCookie(READING_PREF_COOKIES.font, id)
    },

    setSize(id: string) {
      sizeId = id
      saveCookie(READING_PREF_COOKIES.size, id)
    },

    setReadingWidth(value: number) {
      readingWidth = normalizeReadingWidth(value)
      saveCookie(READING_PREF_COOKIES.width, String(readingWidth))
    },

    setReadingWidthIndex(index: number) {
      const option = READING_WIDTH_OPTIONS[index]
      if (option === undefined) return
      this.setReadingWidth(option)
    }
  }
}

export const settingsStore = createSettingsStore()
