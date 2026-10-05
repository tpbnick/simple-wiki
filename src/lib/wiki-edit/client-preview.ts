import { renderMarkdown } from '$lib/markdown/index.js'
import { prepareWikiMarkdownForRender } from '$lib/markdown/prepare-for-render.js'
import { sanitizeWikiHtml } from '$lib/markdown/sanitize-html.js'
import { createWikiTemplateResolver } from '$lib/templates/create-resolver.js'
import { runClientTemplateParse } from '$lib/extensions/client-templates.js'
import { renderExtensionDisabledHtml } from '$lib/extensions/disabled-message.js'
import { buildPreviewContent } from './preview-content.js'

/** Reference data loaded once when the editor opens — used for client-side preview until save. */
export interface EditorPreviewBundle {
  existingSlugs: string[]
  templatePages: Record<string, string>
  extensionData: Record<string, unknown>
  enabledExtensionIds: string[]
  /** Disabled extensions. Preview shows a notice instead of their templates. */
  disabledExtensions: Array<{ id: string; name: string; templates: string[] }>
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
    onExtensionTemplate: (name, params) => {
      const disabled = bundle.disabledExtensions.find((extension) =>
        extension.templates.includes(name)
      )
      if (disabled) return renderExtensionDisabledHtml(disabled.name)
      return runClientTemplateParse(
        name,
        params,
        bundle.extensionData,
        true,
        bundle.enabledExtensionIds,
        bundle.disabledExtensions
      )
    }
  })

  const html = await renderMarkdown(markdown, {
    wikiLinks: { existingPages: new Set(bundle.existingSlugs) },
    templateResolver,
    canEdit: true
  })

  return sanitizeWikiHtml(html)
}
