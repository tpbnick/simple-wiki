import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'
import { slugify } from '$lib/slug.js'
import { getRenderContext } from '$lib/markdown/render-context.js'

export interface WikiLinkOptions {
  existingPages?: Set<string>
  urlBase?: string
}

const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/**
 * Converts `[[Page Title]]` syntax into links, marking missing pages as red links.
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    const { wikiLinks = {} } = getRenderContext()
    const { existingPages, urlBase = '/wiki' } = wikiLinks

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index == null) return
      if (!WIKI_LINK_PATTERN.test(node.value)) return

      WIKI_LINK_PATTERN.lastIndex = 0
      const parts: PhrasingContent[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = WIKI_LINK_PATTERN.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: node.value.slice(lastIndex, match.index) })
        }

        const target = match[1].trim()
        const label = match[2]?.trim() ?? target
        const pageSlug = slugify(target)
        const pageExists = existingPages ? existingPages.has(pageSlug) : true
        const href = pageExists
          ? `${urlBase}/${pageSlug}`
          : `${urlBase}/${pageSlug}?title=${encodeURIComponent(target)}`

        parts.push({
          type: 'link',
          url: href,
          data: {
            hProperties: {
              class: pageExists ? undefined : 'redlink',
              title: target
            }
          },
          children: [{ type: 'text', value: label }]
        })

        lastIndex = match.index + match[0].length
      }

      if (lastIndex < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts)
      }
    })
  }
}
