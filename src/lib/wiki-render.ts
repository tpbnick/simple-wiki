import type { Page } from '$lib/db/index.js'
import { getAllPageSlugs } from '$lib/db/pages.js'
import { renderMarkdown, extractToc, type TocEntry } from '$lib/markdown/index.js'
import { templateResolver } from '$lib/templates/index.js'
import { normalizeInfoboxForRender } from '$lib/templates/infobox-editor.js'
import { normalizeImageBoxForRender } from '$lib/templates/imagebox-editor.js'
import { runOnPageRender } from '$lib/extensions/server.js'
import { sanitizeWikiHtml } from '$lib/markdown/sanitize-html.js'

const PREVIEW_PAGE: Page = {
  /** Synthetic id — preview renders are not backed by a database row. */
  id: 0,
  slug: '_preview',
  title: 'Preview',
  content: '',
  namespace: 'article',
  created_at: '',
  updated_at: ''
}

/** Applies infobox/imagebox normalization used before reader rendering. */
export function prepareWikiMarkdownForRender(content: string): string {
  return normalizeImageBoxForRender(normalizeInfoboxForRender(content))
}

/**
 * Renders markdown with wiki links, templates, and syntax highlighting.
 * @param content - Raw markdown source.
 * @param options - Wiki-link, template, and permission options for this render.
 */
export async function renderWikiMarkdown(
  content: string,
  options: import('$lib/markdown/index.js').RenderOptions = {}
): Promise<string> {
  return renderMarkdown(prepareWikiMarkdownForRender(content), {
    templateResolver,
    wikiLinks: { existingPages: getAllPageSlugs() },
    ...options
  })
}

/**
 * Renders markdown through the full reader pipeline: markdown, extension hooks, sanitize.
 * @param content - Raw markdown source.
 * @param options - Optional page record and permission flags. Preview renders use {@link PREVIEW_PAGE} (id 0).
 */
export async function renderWikiContentForDisplay(
  content: string,
  options: { page?: Page; canEdit?: boolean } = {}
): Promise<string> {
  const rendered = await renderWikiMarkdown(content, { canEdit: options.canEdit ?? false })
  const page = options.page ?? { ...PREVIEW_PAGE, content }
  return sanitizeWikiHtml(runOnPageRender(rendered, page))
}

/**
 * Renders a stored page to HTML and extracts its table of contents.
 * @param page - Page record from the database.
 * @param options - Permission flags passed into template rendering.
 */
export async function renderWikiPage(
  page: Page,
  options: { canEdit?: boolean } = {}
): Promise<{ html: string; toc: TocEntry[] }> {
  return {
    html: await renderWikiContentForDisplay(page.content, {
      page,
      canEdit: options.canEdit ?? false
    }),
    toc: extractToc(prepareWikiMarkdownForRender(page.content))
  }
}
