import { imageBoxDataFromParams, renderImageBoxHtml } from './imagebox-editor.js'

/**
 * Renders the built-in ImageBox template as HTML.
 * @param params - Template parameters from the wiki source.
 */
export function renderImageBox(params: Record<string, string>): string {
  return renderImageBoxHtml(imageBoxDataFromParams(params))
}
