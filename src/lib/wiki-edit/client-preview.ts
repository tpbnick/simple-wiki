import { renderMarkdown } from '$lib/markdown/index.js'
import { prepareWikiMarkdownForRender } from '$lib/markdown/prepare-for-render.js'
import { sanitizeWikiHtml } from '$lib/markdown/sanitize-html.js'
import { createWikiTemplateResolver } from '$lib/templates/create-resolver.js'
import type { FamilyTreePreviewRecord } from '$extensions/family-tree/lib/embed-client.js'
import { buildPreviewContent } from './preview-content.js'

/** Reference data loaded once when the editor opens — used for client-side preview until save. */
export interface EditorPreviewBundle {
  existingSlugs: string[]
  templatePages: Record<string, string>
  familyTrees: Record<string, FamilyTreePreviewRecord>
}

export interface EditorPreviewOptions {
  stripInfobox: boolean
  stripImageBoxes: boolean
}

/** Renders editor preview HTML in the browser (no API calls). */
export async function renderEditorPreview(
  rawContent: string,
  bundle: EditorPreviewBundle,
  options: EditorPreviewOptions
): Promise<string> {
  const markdown = prepareWikiMarkdownForRender(
    buildPreviewContent(rawContent, {
      stripInfobox: options.stripInfobox,
      stripImageBoxes: options.stripImageBoxes
    })
  )

  const templateResolver = createWikiTemplateResolver({
    templatePagesBySlug: bundle.templatePages,
    familyTreesBySlug: bundle.familyTrees,
    canEdit: true
  })

  const html = await renderMarkdown(markdown, {
    wikiLinks: { existingPages: new Set(bundle.existingSlugs) },
    templateResolver,
    canEdit: true
  })

  return sanitizeWikiHtml(html)
}
