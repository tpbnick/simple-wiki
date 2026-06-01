import { removeInfoboxFromContent } from '$lib/templates/infobox-editor.js'
import { removeAllImageBoxesFromContent } from '$lib/templates/imagebox-editor.js'

/** Strip visual editor blocks from raw markdown before preview render. */
export function buildPreviewContent(
  raw: string,
  options: { stripInfobox: boolean; stripImageBoxes: boolean }
): string {
  let next = raw
  if (options.stripInfobox) next = removeInfoboxFromContent(next)
  if (options.stripImageBoxes) next = removeAllImageBoxesFromContent(next)
  return next
}
