import { renderInfobox } from './infobox-render.js'
import { renderImageBox } from './imagebox-render.js'
import { slugify } from '$lib/slug.js'
import { escapeHtml } from '$lib/html.js'
import { renderMarkdownSync } from '$lib/markdown/index.js'
import {
  getRenderContext,
  getTemplateDepth,
  withTemplateDepth
} from '$lib/markdown/render-context.js'
import {
  renderFamilyTreeEmbedClient,
  type FamilyTreePreviewRecord
} from '$extensions/family-tree/lib/embed-client.js'
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

/** Replaces `{{{key}}}` placeholders in a template page with raw parameter values. */
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

export interface WikiTemplateResolverOptions {
  /** Template page markdown keyed by slug (client editor preview). */
  templatePagesBySlug?: Record<string, string>
  /** Lazy template lookup (server reader). */
  getTemplateSource?: (slug: string) => string | null
  /** Family tree records keyed by slug (client editor preview). */
  familyTreesBySlug?: Record<string, FamilyTreePreviewRecord>
  /** Extension templates such as FamilyTree on the server. */
  onExtensionTemplate?: (name: string, params: Record<string, string>) => string | null
  canEdit?: boolean
}

function resolveUserTemplate(
  name: string,
  params: Record<string, string>,
  source: string,
  resolver: TemplateResolver
): string {
  const substituted = substituteTemplateParams(source, params)
  if (getTemplateDepth() >= MAX_TEMPLATE_DEPTH) {
    return `<div class="user-template">${escapeHtml(substituted)}</div>`
  }

  return withTemplateDepth(() => {
    const parentContext = getRenderContext()
    return renderMarkdownSync(substituted, {
      templateResolver: resolver,
      wikiLinks: parentContext.wikiLinks,
      canEdit: parentContext.canEdit
    })
  })
}

/**
 * Builds a template resolver for markdown rendering.
 * Server uses `onExtensionTemplate` + `getTemplateSource`; the editor passes preloaded maps.
 */
export function createWikiTemplateResolver(
  options: WikiTemplateResolverOptions = {}
): TemplateResolver {
  const {
    templatePagesBySlug = {},
    getTemplateSource,
    familyTreesBySlug = {},
    onExtensionTemplate,
    canEdit = false
  } = options

  const resolver: TemplateResolver = (name, params) => {
    const extensionResult = onExtensionTemplate?.(name, params)
    if (extensionResult != null) return extensionResult

    if (name === 'FamilyTree' && !onExtensionTemplate) {
      return renderFamilyTreeEmbedClient(params, familyTreesBySlug, canEdit)
    }

    const builtIn = builtInTemplates[name]
    if (builtIn) return builtIn(params)

    const pageSlug = slugify(name)
    const source = templatePagesBySlug[pageSlug] ?? getTemplateSource?.(pageSlug) ?? null
    if (!source) return null

    return resolveUserTemplate(name, params, source, resolver)
  }

  return resolver
}

export { renderInfobox }
