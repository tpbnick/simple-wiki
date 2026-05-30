import { escapeHtml } from '$lib/html.js'
import { slugify } from '$lib/slug.js'

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/
const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/
const BOLD_PATTERN = /\*\*(.+?)\*\*/
const ITALIC_PATTERN = /\*(.+?)\*/
const BARE_URL_PATTERN = /https?:\/\/[^\s<>")\]]+/g

export interface WikiInlineOptions {
  existingPages?: Set<string>
  urlBase?: string
}

type InlinePattern = {
  regex: RegExp
  render: (match: RegExpExecArray, options: WikiInlineOptions) => string
}

const INLINE_PATTERNS: InlinePattern[] = [
  {
    regex: WIKI_LINK_PATTERN,
    render: (match, options) => {
      const target = match[1].trim()
      const label = match[2]?.trim() ?? target
      const pageSlug = slugify(target)
      const urlBase = options.urlBase ?? '/wiki'
      const pageExists = options.existingPages ? options.existingPages.has(pageSlug) : true
      const href = pageExists
        ? `${urlBase}/${pageSlug}`
        : `${urlBase}/${pageSlug}?title=${encodeURIComponent(target)}`
      const classAttr = pageExists ? '' : ' class="redlink"'
      return `<a href="${escapeHtml(href)}"${classAttr}>${escapeHtml(label)}</a>`
    }
  },
  {
    regex: MARKDOWN_LINK_PATTERN,
    render: (match, options) =>
      `<a href="${escapeHtml(match[2])}" rel="noopener noreferrer">${renderWikiInlineMarkdown(match[1], options)}</a>`
  },
  {
    regex: BOLD_PATTERN,
    render: (match, options) => `<strong>${renderWikiInlineMarkdown(match[1], options)}</strong>`
  },
  {
    regex: ITALIC_PATTERN,
    render: (match, options) => `<em>${renderWikiInlineMarkdown(match[1], options)}</em>`
  }
]

function nextInlineMatch(
  value: string,
  start: number,
  options: WikiInlineOptions
): { index: number; length: number; html: string } | null {
  let earliest: { index: number; length: number; html: string } | null = null

  for (const pattern of INLINE_PATTERNS) {
    const slice = value.slice(start)
    const match = pattern.regex.exec(slice)
    if (!match) continue

    const index = start + match.index
    if (!earliest || index < earliest.index) {
      earliest = {
        index,
        length: match[0].length,
        html: pattern.render(match, options)
      }
    }
  }

  return earliest
}

/** Renders inline wiki markdown: wiki links, markdown links, bold, italic, bare URLs. */
export function renderWikiInlineMarkdown(value: string, options: WikiInlineOptions = {}): string {
  let result = ''
  let pos = 0

  while (pos < value.length) {
    const match = nextInlineMatch(value, pos, options)
    if (!match) {
      result += renderBareUrlsInText(value.slice(pos))
      break
    }

    result += renderBareUrlsInText(value.slice(pos, match.index))
    result += match.html
    pos = match.index + match.length
  }

  return result
}

function renderBareUrlsInText(text: string): string {
  if (!text) return ''

  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  BARE_URL_PATTERN.lastIndex = 0
  while ((match = BARE_URL_PATTERN.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index))
    result += `<a href="${escapeHtml(match[0])}" rel="noopener noreferrer">${escapeHtml(match[0])}</a>`
    lastIndex = match.index + match[0].length
  }

  result += escapeHtml(text.slice(lastIndex))
  return result
}
