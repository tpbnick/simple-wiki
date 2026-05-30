import { escapeHtml } from '$lib/html.js'

/** Shared reader error card for family tree template failures. */
export function renderFamilyTreeErrorHtml(title: string, message: string): string {
  return `<div class="wiki-family-tree-error not-prose" role="alert">
    <p class="wiki-family-tree-error__title">${escapeHtml(title)}</p>
    <p class="wiki-family-tree-error__message">${escapeHtml(message)}</p>
  </div>`
}
