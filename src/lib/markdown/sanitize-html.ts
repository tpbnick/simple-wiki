import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { wikiSanitizeSchema } from './sanitize-schema.js'

const sanitizeProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, wikiSanitizeSchema)
  .use(rehypeStringify, { allowDangerousHtml: true })

/** Re-sanitizes rendered HTML (e.g. after extension hooks). */
export function sanitizeWikiHtml(html: string): string {
  const file = sanitizeProcessor.processSync(html)
  return String(file)
}
