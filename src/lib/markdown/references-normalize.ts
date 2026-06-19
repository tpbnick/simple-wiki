import { isInsideCode } from '$lib/templates/infobox-editor.js'

const ANON_MARKER_RE = /\[\^](?!:)/g
const ANON_DEF_RE = /^[\t ]*\[\^\]:\s?(.*)$/
const NAMED_INLINE_RE = /\[\^([^\]:]+)\](?!:)/g
const NAMED_DEF_RE = /^[\t ]*\[\^([^\]]+)\]:\s?(.*)$/
const LEGACY_INLINE_DEF_RE = /^(.+?)\[\^([^\]:]+)\]:\s*(.+)$/

function trimDefinition(text: string): string {
  return text.trim()
}

function toGfmId(index: number): string {
  return `wiki-ref-${index}`
}

/** Parses the description inside [^: ...], supporting wiki links and markdown links. */
function readInlineReferenceDescription(
  content: string,
  start: number
): { end: number; description: string } | null {
  if (!content.startsWith('[^:', start)) return null

  let i = start + 3
  while (content[i] === ' ') i += 1
  const descriptionStart = i

  while (i < content.length) {
    if (content.startsWith('[[', i)) {
      const close = content.indexOf(']]', i + 2)
      if (close === -1) return null
      i = close + 2
      continue
    }

    if (content[i] === '[') {
      const closeBracket = content.indexOf(']', i + 1)
      if (closeBracket === -1) return null
      if (content[closeBracket + 1] === '(') {
        const closeParen = content.indexOf(')', closeBracket + 2)
        if (closeParen === -1) return null
        i = closeParen + 1
        continue
      }
    }

    if (content[i] === ']') {
      return {
        end: i + 1,
        description: trimDefinition(content.slice(descriptionStart, i))
      }
    }

    i += 1
  }

  return null
}

function replaceInlineDescriptionRefs(content: string): {
  body: string
  definitions: Map<string, string>
} {
  const definitions = new Map<string, string>()
  let index = 0
  let body = ''
  let cursor = 0

  while (cursor < content.length) {
    const open = content.indexOf('[^:', cursor)
    if (open === -1) {
      body += content.slice(cursor)
      break
    }

    body += content.slice(cursor, open)
    if (isInsideCode(content, open, open + 4)) {
      body += '[^:'
      cursor = open + 3
      continue
    }
    const parsed = readInlineReferenceDescription(content, open)
    if (!parsed) {
      body += '[^:'
      cursor = open + 3
      continue
    }

    index += 1
    const id = toGfmId(index)
    definitions.set(id, parsed.description)
    body += `[^${id}]`
    cursor = parsed.end
  }

  return { body, definitions }
}

function buildGfmFootnotes(body: string, definitions: Map<string, string>): string {
  if (definitions.size === 0) return body.trimEnd()

  const definitionBlock = [...definitions.entries()]
    .map(([id, text]) => `[^${id}]: ${text}`)
    .join('\n')

  const trimmedBody = body.trimEnd()
  return trimmedBody ? `${trimmedBody}\n\n${definitionBlock}` : definitionBlock
}

/** Self-contained inline references: [^: description] */
function extractInlineDescriptionRefs(content: string): {
  body: string
  definitions: Map<string, string>
} {
  return replaceInlineDescriptionRefs(content)
}

/** Block definitions and legacy inline prose definitions. */
function extractBlockDefinitions(content: string): {
  body: string
  anonymous: string[]
  named: Map<string, string>
} {
  const anonymous: string[] = []
  const named = new Map<string, string>()
  const bodyLines: string[] = []
  let offset = 0

  for (const line of content.split('\n')) {
    const lineStart = offset
    const lineEnd = offset + line.length
    offset = lineEnd + 1

    if (isInsideCode(content, lineStart, lineEnd)) {
      bodyLines.push(line)
      continue
    }

    const anonMatch = line.match(ANON_DEF_RE)
    if (anonMatch) {
      anonymous.push(trimDefinition(anonMatch[1]))
      continue
    }

    const namedMatch = line.match(NAMED_DEF_RE)
    if (namedMatch) {
      named.set(namedMatch[1], trimDefinition(namedMatch[2]))
      continue
    }

    const legacyInline = line.match(LEGACY_INLINE_DEF_RE)
    if (legacyInline && !/^\s*\[\^/.test(line)) {
      named.set(legacyInline[2], trimDefinition(legacyInline[3]))
      bodyLines.push(`${legacyInline[1]}[^${legacyInline[2]}]`)
      continue
    }

    bodyLines.push(line)
  }

  return { body: bodyLines.join('\n'), anonymous, named }
}

function pairAnonymousMarkers(
  body: string,
  anonymousDefinitions: string[],
  startIndex: number
): { body: string; definitions: Map<string, string> } {
  const definitions = new Map<string, string>()
  let index = startIndex
  let definitionIndex = 0
  let result = ''
  let cursor = 0

  for (const match of body.matchAll(ANON_MARKER_RE)) {
    const start = match.index ?? 0
    const end = start + match[0].length

    result += body.slice(cursor, start)
    if (isInsideCode(body, start, end)) {
      result += match[0]
    } else {
      index += 1
      const id = toGfmId(index)
      const description = anonymousDefinitions[definitionIndex]
      if (description !== undefined) {
        definitions.set(id, description)
        definitionIndex += 1
      }
      result += `[^${id}]`
    }
    cursor = end
  }

  const nextBody = result + body.slice(cursor)

  return { body: nextBody, definitions }
}

function appendMissingNamedMarkers(body: string, namedDefinitions: Map<string, string>): string {
  const present = new Set<string>()
  for (const match of body.matchAll(NAMED_INLINE_RE)) {
    present.add(match[1])
  }

  const missing = [...namedDefinitions.keys()].filter((id) => !present.has(id))
  if (missing.length === 0) return body

  const markers = missing.map((id) => `[^${id}]`).join('')
  const trimmed = body.trimEnd()
  if (!trimmed) return markers

  const lines = trimmed.split('\n')
  lines[lines.length - 1] = `${lines[lines.length - 1]}${markers}`
  return lines.join('\n')
}

/**
 * Normalizes wiki reference markdown before GFM parsing.
 *
 * Supported authoring forms (display numbers are assigned by order in the text):
 * - [^: description] — self-contained inline reference
 * - [^] in text + [^]: description lines at the bottom — paired in order
 * - [^id] in text + [^id]: description — legacy explicit ids (no renumbering needed)
 */
export function normalizeReferencesForRender(content: string): string {
  const inline = extractInlineDescriptionRefs(content)
  const extracted = extractBlockDefinitions(inline.body)

  const paired = pairAnonymousMarkers(extracted.body, extracted.anonymous, inline.definitions.size)
  const definitions = new Map([...inline.definitions, ...paired.definitions, ...extracted.named])

  let body = appendMissingNamedMarkers(paired.body, extracted.named)
  return buildGfmFootnotes(body, definitions)
}
