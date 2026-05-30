import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { extractToc } from '$lib/markdown/index.js'
import { remarkWikiLinks } from './plugins/wiki-links.js'
import { wikiSanitizeSchema } from '$lib/markdown/sanitize-schema.js'

function headingIdsFromHtml(markdown: string): string[] {
  const html = String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkWikiLinks)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeSanitize, wikiSanitizeSchema)
      .use(rehypeStringify)
      .processSync(markdown)
  )
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
}

describe('extractToc', () => {
  it('generates ids that match rehype-slug output', () => {
    const markdown = [
      '## Getting started',
      '## Tips & Tricks',
      '## C++ Guide',
      '## Getting started'
    ].join('\n\n')

    const tocIds = extractToc(markdown).map((entry) => entry.id)
    const htmlIds = headingIdsFromHtml(markdown)

    expect(tocIds).toEqual(htmlIds)
  })

  it('ignores headings inside fenced code blocks', () => {
    const markdown = [
      '## Real heading',
      '```md',
      '## Not a heading',
      '```',
      '### Another real heading'
    ].join('\n')

    const tocIds = extractToc(markdown).map((entry) => entry.id)
    const htmlIds = headingIdsFromHtml(markdown)

    expect(tocIds).toEqual(htmlIds)
    expect(tocIds).toEqual(['real-heading', 'another-real-heading'])
  })

  it('matches wiki link labels in headings', () => {
    const markdown = '## See [[Other Page|Other page label]]'

    const tocIds = extractToc(markdown).map((entry) => entry.id)
    const htmlIds = headingIdsFromHtml(markdown)

    expect(tocIds).toEqual(htmlIds)
    expect(tocIds).toEqual(['see-other-page-label'])
  })
})
