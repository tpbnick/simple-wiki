import { visit } from 'unist-util-visit'
import type { Root, Text, HTML, Paragraph, PhrasingContent } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { getRenderContext } from '$lib/markdown/render-context.js'
import { escapeHtml } from '$lib/html.js'
import { parseTemplateBody } from '$lib/templates/param-string.js'

export type TemplateResolver = (
  name: string,
  params: Record<string, string>
) => string | null

const TEMPLATE_PATTERN = /\{\{([^{}]+?)\}\}/g
const BLOCK_TEMPLATE_PATTERN = /^\s*\{\{([^{}]+?)\}\}\s*$/

function serializePhrasing(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value
        case 'link':
          return `[${serializePhrasing(node.children)}](${node.url})`
        case 'emphasis':
          return `*${serializePhrasing(node.children)}*`
        case 'strong':
          return `**${serializePhrasing(node.children)}**`
        default:
          return toString(node)
      }
    })
    .join('')
}

function paragraphToText(paragraph: Paragraph): string {
  return serializePhrasing(paragraph.children)
}

function parseTemplate(raw: string): { name: string; params: Record<string, string> } {
  return parseTemplateBody(raw)
}

function toTemplateHtml(
  name: string,
  params: Record<string, string>,
  rawTemplate: string,
  resolveTemplate: TemplateResolver
): HTML {
  const rendered = resolveTemplate(name, params)
  if (rendered != null) {
    return { type: 'html', value: rendered }
  }

  return {
    type: 'html',
    value: `<span class="template-missing" title="Template not found">{{${escapeHtml(rawTemplate)}}}</span>`
  }
}

/**
 * Replaces `{{Template|key=value}}` syntax with rendered HTML.
 */
export function remarkTemplates() {
  return (tree: Root) => {
    const { templateResolver = () => null } = getRenderContext()

    visit(tree, 'paragraph', (paragraph: Paragraph, index, parent) => {
      if (!parent || index == null) return

      const text = paragraphToText(paragraph)
      const blockMatch = BLOCK_TEMPLATE_PATTERN.exec(text)
      if (!blockMatch) return

      const { name, params } = parseTemplate(blockMatch[1])
      parent.children.splice(
        index,
        1,
        toTemplateHtml(name, params, blockMatch[1], templateResolver)
      )
    })

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index == null) return
      if (!TEMPLATE_PATTERN.test(node.value)) return

      TEMPLATE_PATTERN.lastIndex = 0
      const children: Array<Text | HTML> = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = TEMPLATE_PATTERN.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) })
        }

        const { name, params } = parseTemplate(match[1])
        children.push(toTemplateHtml(name, params, match[1], templateResolver))
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      if (children.length > 0) {
        parent.children.splice(index, 1, ...children)
      }
    })
  }
}
