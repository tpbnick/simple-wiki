/**
 * Built-in wiki template rendering and resolution.
 * - `*-render.ts` — HTML output for reader view
 * - `*-editor.ts` — markdown serialization for the page editor
 * - `param-string.ts` — shared parameter parsing (also used by markdown/plugins/wiki-templates.ts)
 */
import { getPage } from '$lib/db/index.js'
import { runOnTemplateParse } from '$lib/extensions/server.js'
import { createWikiTemplateResolver } from './create-resolver.js'
import type { TemplateResolver } from '$lib/markdown/index.js'

/** Resolves a template call from extensions, built-ins, or the database. */
export const templateResolver: TemplateResolver = createWikiTemplateResolver({
  onExtensionTemplate: runOnTemplateParse,
  getTemplateSource(slug) {
    const page = getPage(slug)
    return page?.namespace === 'template' ? page.content : null
  }
})

export { renderInfobox } from './create-resolver.js'
