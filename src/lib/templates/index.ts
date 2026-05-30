/**
 * Built-in wiki template rendering and resolution.
 * - `*-render.ts` — HTML output for reader view
 * - `*-editor.ts` — markdown serialization for the page editor
 * - `param-string.ts` — shared parameter parsing (also used by markdown/plugins/wiki-templates.ts)
 */
import { renderInfobox } from './infobox-render.js'
import { renderImageBox } from './imagebox-render.js'
import { getPage } from '$lib/db/index.js'
import { slugify } from '$lib/slug.js'
import { escapeHtml } from '$lib/html.js'
import { renderMarkdownSync } from '$lib/markdown/index.js'
import {
  getRenderContext,
  getTemplateDepth,
  withTemplateDepth
} from '$lib/markdown/render-context.js'
import { runOnTemplateParse } from '$lib/extensions/server.js'
import type { TemplateResolver } from '$lib/markdown/index.js'

const MAX_TEMPLATE_DEPTH = 3

const builtInTemplates: Record<string, (params: Record<string, string>) => string> = {
  Infobox: (params) => renderInfobox(params),
  'Infobox Country': (params) => renderInfobox(params, 'Country'),
  'Infobox Person': (params) => renderInfobox(params, 'Person'),
  ImageBox: (params) => renderImageBox(params),
  Note: (params) =>
    `<div class="alert alert-info my-4 text-sm">${escapeHtml(params['1'] ?? params.text ?? '')}</div>`,
  Warning: (params) =>
    `<div class="alert alert-warning my-4 text-sm">${escapeHtml(params['1'] ?? params.text ?? '')}</div>`,
  Stub: () =>
    `<div class="alert alert-warning mt-8 text-sm">This article is a stub. You can help by expanding it.</div>`
}

/**
 * Replaces `{{{key}}}` placeholders in a template page with raw parameter values.
 * @param source - Template markdown from the database.
 * @param params - Values passed into the template call.
 */
function substituteTemplateParams(source: string, params: Record<string, string>): string {
  let result = source

  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{{{${key}}}}`, value)
    result = result.replaceAll(`{{{${key}|}}}`, value)
  }

  result = result.replace(/\{\{\{[^}]+\|([^}]*)\}\}\}/g, '$1')
  result = result.replace(/\{\{\{[^}]+\}\}\}/g, '')
  return result
}

/**
 * Renders a user-defined template stored in the database.
 * @param name - Template name from the wiki source.
 * @param params - Values passed into the template call.
 */
function resolveDatabaseTemplate(name: string, params: Record<string, string>): string | null {
  const pageSlug = slugify(name)
  const page = getPage(pageSlug)
  if (!page || page.namespace !== 'template') return null

  const source = substituteTemplateParams(page.content, params)
  if (getTemplateDepth() >= MAX_TEMPLATE_DEPTH) {
    return `<div class="user-template">${escapeHtml(source)}</div>`
  }

  return withTemplateDepth(() => {
    const parentContext = getRenderContext()
    return renderMarkdownSync(source, {
      templateResolver,
      wikiLinks: parentContext.wikiLinks,
      canEdit: parentContext.canEdit
    })
  })
}

/**
 * Resolves a template call from extensions, built-ins, or the database.
 * @param name - Template name from the wiki source.
 * @param params - Values passed into the template call.
 */
export const templateResolver: TemplateResolver = (name, params) => {
  const extensionResult = runOnTemplateParse(name, params)
  if (extensionResult != null) return extensionResult

  const builtIn = builtInTemplates[name]
  if (builtIn) return builtIn(params)

  return resolveDatabaseTemplate(name, params)
}

export { renderInfobox }
