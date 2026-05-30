import { escapeHtml } from '$lib/html.js'

/** Removes wiki template blocks so snippets show readable prose instead of raw markup. */
function stripWikiTemplates(text: string): string {
  return text
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/\{\{[\s\S]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Escapes HTML in FTS snippets while preserving SQLite highlight tags.
 * @param snippet - Raw snippet from the FTS `snippet()` function.
 */
export function sanitizeSearchSnippet(snippet: string): string {
  const cleaned = stripWikiTemplates(snippet)
  if (!cleaned) return ''

  return cleaned
    .split(/(<\/?mark>)/gi)
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === '<mark>' || lower === '</mark>') return part
      return escapeHtml(part)
    })
    .join('')
}
