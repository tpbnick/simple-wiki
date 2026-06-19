import { normalizeInfoboxForRender } from '$lib/templates/infobox-editor.js'
import { normalizeImageBoxForRender } from '$lib/templates/imagebox-editor.js'
import { normalizeReferencesForRender } from './references-normalize.js'

/** Normalizes infobox/imagebox/reference markdown before the reader render pipeline. */
export function prepareWikiMarkdownForRender(content: string): string {
  return normalizeReferencesForRender(
    normalizeImageBoxForRender(normalizeInfoboxForRender(content))
  )
}
