import type { WikiTheme } from '$lib/wiki-theme.js'
import { WIKI_THEME_COOKIE } from '$lib/wiki-theme.js'

type Theme = WikiTheme

function createThemeStore() {
  let current = $state<Theme>('wiki-light')

  return {
    get current() {
      return current
    },
    get isDark() {
      return current === 'wiki-dark'
    },

    init() {
      if (typeof document === 'undefined') return
      const saved = document.cookie.match(new RegExp(`${WIKI_THEME_COOKIE}=([^;]+)`))?.[1] as
        | Theme
        | undefined
      if (saved === 'wiki-light' || saved === 'wiki-dark') {
        current = saved
        document.documentElement.setAttribute('data-theme', saved)
      }
    },

    toggle() {
      this.set(current === 'wiki-light' ? 'wiki-dark' : 'wiki-light')
    },

    set(t: Theme) {
      current = t
      if (typeof document !== 'undefined') {
        const el = document.documentElement
        el.classList.add('no-transition')
        el.setAttribute('data-theme', t)
        document.cookie = `${WIKI_THEME_COOKIE}=${t}; path=/; max-age=31536000; SameSite=Lax`
        requestAnimationFrame(() => el.classList.remove('no-transition'))
      }
    }
  }
}

export const theme = createThemeStore()
