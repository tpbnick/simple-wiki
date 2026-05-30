/**
 * Escapes HTML special characters in a plain-text string.
 * @param text - Untrusted text that may contain HTML characters.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
