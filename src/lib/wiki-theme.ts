export type WikiTheme = 'wiki-light' | 'wiki-dark'

export const WIKI_THEME_COOKIE = 'wiki-theme'

/** Surface colors used by critical CSS, DaisyUI tokens, and theme-color meta. */
export const WIKI_THEME_SURFACES: Record<
  WikiTheme,
  { base100: string; base200: string; text: string; chrome: string; scheme: 'light' | 'dark' }
> = {
  'wiki-light': {
    base100: '#ffffff',
    base200: '#f4f5f7',
    text: '#111827',
    chrome: '#f4f5f7',
    scheme: 'light'
  },
  'wiki-dark': {
    base100: '#13151a',
    base200: '#1c1f27',
    text: '#e2e8f0',
    chrome: '#1c1f27',
    scheme: 'dark'
  }
}

/** Resolves the active wiki theme from a cookie value. */
export function resolveWikiTheme(value: string | undefined): WikiTheme {
  return value === 'wiki-dark' ? 'wiki-dark' : 'wiki-light'
}

/** Inline CSS applied before the app bundle loads to avoid theme flash. */
export function buildCriticalThemeCss(): string {
  const rules = Object.entries(WIKI_THEME_SURFACES).map(
    ([theme, surface]) =>
      `html[data-theme='${theme}']{color-scheme:${surface.scheme};background-color:${surface.base200};color:${surface.text};--color-base-100:${surface.base100};--color-base-200:${surface.base200}}`
  )

  return [
    ...rules,
    'body{margin:0;background-color:var(--color-base-200);color:inherit}',
    '#main-content{background-color:var(--color-base-100)}'
  ].join('')
}

/** Applies wiki theme placeholders in the HTML shell. */
export function applyWikiHtmlShell(html: string, theme: WikiTheme): string {
  return html
    .replaceAll('%wiki.theme%', theme)
    .replaceAll('%wiki.theme-color%', WIKI_THEME_SURFACES[theme].chrome)
    .replaceAll('%wiki.critical-theme-css%', buildCriticalThemeCss())
}
