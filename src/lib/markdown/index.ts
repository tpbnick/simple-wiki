import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize from 'rehype-sanitize'
import rehypeRaw from 'rehype-raw'
import rehypeShiki from '@shikijs/rehype'
import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import type { Heading, Root } from 'mdast'
import { remarkWikiLinks, type WikiLinkOptions } from './plugins/wiki-links.js'
import { remarkTemplates, type TemplateResolver } from './plugins/templates.js'
import { wikiSanitizeSchema } from './sanitize-schema.js'
import { withRenderContext, withRenderContextAsync } from './render-context.js'

export type { WikiLinkOptions, TemplateResolver }

export interface RenderOptions {
  wikiLinks?: WikiLinkOptions
  templateResolver?: TemplateResolver
  canEdit?: boolean
}

export interface TocEntry {
  level: number
  id: string
  text: string
}

let fullProcessor: ReturnType<typeof buildProcessor> | null = null
let basicProcessor: ReturnType<typeof buildProcessor> | null = null
let tocProcessor: ReturnType<typeof buildTocProcessor> | null = null

function buildTocProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkTemplates)
    .use(remarkGfm)
    .use(remarkWikiLinks)
}

function getTocProcessor(): ReturnType<typeof buildTocProcessor> {
  if (!tocProcessor) tocProcessor = buildTocProcessor()
  return tocProcessor!
}

function buildProcessor(includeSyntaxHighlighting: boolean) {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkTemplates)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)

  if (includeSyntaxHighlighting) {
    pipeline.use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      cssVariablePrefix: '--shiki-',
      defaultColor: false
    })
  }

  return pipeline
    .use(rehypeSanitize, wikiSanitizeSchema)
    .use(rehypeStringify, { allowDangerousHtml: true })
}

function getFullProcessor(): ReturnType<typeof buildProcessor> {
  if (!fullProcessor) fullProcessor = buildProcessor(true)
  return fullProcessor!
}

function getBasicProcessor(): ReturnType<typeof buildProcessor> {
  if (!basicProcessor) basicProcessor = buildProcessor(false)
  return basicProcessor!
}

/**
 * Renders markdown to sanitized HTML with syntax highlighting.
 * @param content - Raw markdown source.
 * @param options - Wiki-link and template options for this render.
 */
export async function renderMarkdown(
  content: string,
  options: RenderOptions = {}
): Promise<string> {
  const { wikiLinks = {}, templateResolver = () => null, canEdit = false } = options
  const processor = getFullProcessor()

  return withRenderContextAsync({ wikiLinks, templateResolver, canEdit }, async () => {
    const file = await processor.process(content)
    return String(file)
  })
}

/**
 * Renders markdown synchronously without syntax highlighting.
 * @param content - Raw markdown source.
 * @param options - Wiki-link and template options for this render.
 */
export function renderMarkdownSync(content: string, options: RenderOptions = {}): string {
  const { wikiLinks = {}, templateResolver = () => null, canEdit = false } = options
  const processor = getBasicProcessor()

  return withRenderContext({ wikiLinks, templateResolver, canEdit }, () => {
    const file = processor.processSync(content)
    return String(file)
  })
}

/**
 * Extracts heading entries for the table of contents sidebar.
 * Uses the same AST text as the render pipeline so IDs match rehype-slug.
 * @param markdown - Raw markdown source.
 */
export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = []
  const slugger = new GithubSlugger()

  return withRenderContext({ wikiLinks: {}, templateResolver: () => null }, () => {
    const processor = getTocProcessor()
    const tree = processor.runSync(processor.parse(markdown)) as Root

    visit(tree, 'heading', (node: Heading) => {
      if (node.depth > 4) return
      const text = toString(node).trim()
      if (!text) return
      entries.push({ level: node.depth, id: slugger.slug(text), text })
    })

    return entries
  })
}
