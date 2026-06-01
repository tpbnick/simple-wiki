import { normalizeInfoboxForRender } from '$lib/templates/infobox-editor.js'
import { normalizeImageBoxForRender } from '$lib/templates/imagebox-editor.js'

/** Normalizes infobox/imagebox markdown before the reader render pipeline. */
export function prepareWikiMarkdownForRender(content: string): string {
  return normalizeImageBoxForRender(normalizeInfoboxForRender(content))
}
