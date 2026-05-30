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

class SettingsStore {
  fontId = $state('atkinson')
  sizeId = $state('medium')
  readingWidth = $state<ReadingWidth>(DEFAULT_READING_WIDTH)

  get font() {
    return FONTS.find((entry) => entry.id === this.fontId) ?? FONTS[0]
  }
  get size() {
    return SIZES.find((entry) => entry.id === this.sizeId) ?? SIZES[1]
  }

  init() {
    if (typeof document === 'undefined') return
    const prefs = resolveReadingPrefs(documentCookieReader())
    this.fontId = prefs.fontId
    this.sizeId = prefs.sizeId
    this.readingWidth = prefs.readingWidth
    this._apply()
  }

  setFont(id: string) {
    this.fontId = id
    this._save(READING_PREF_COOKIES.font, id)
    this._apply()
  }

  setSize(id: string) {
    this.sizeId = id
    this._save(READING_PREF_COOKIES.size, id)
    this._apply()
  }

  setReadingWidth(value: number) {
    this.readingWidth = normalizeReadingWidth(value)
    this._save(READING_PREF_COOKIES.width, String(this.readingWidth))
    this._apply()
  }

  setReadingWidthIndex(index: number) {
    const option = READING_WIDTH_OPTIONS[index]
    if (option === undefined) return
    this.setReadingWidth(option)
  }

  _apply() {
    if (typeof document === 'undefined') return
    const el = document.documentElement
    el.classList.add('no-transition')
    el.style.setProperty('--reading-font', this.font.stack)
    el.style.setProperty('--reading-font-size', this.size.value)
    el.style.setProperty('--reading-width', `${this.readingWidth}%`)
    requestAnimationFrame(() => el.classList.remove('no-transition'))
  }

  _save(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
}

export const settingsStore = new SettingsStore()
