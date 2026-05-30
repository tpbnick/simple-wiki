import { escapeHtml } from '$lib/html.js'
import {
  decodeTemplateParamValue,
  partsToParamRecord,
  splitTemplateParamString
} from '$lib/templates/param-string.js'
import {
  newEditorId,
  orderParamFromRecord,
  TEMPLATE_ORDER_PARAM_KEYS
} from '$lib/templates/template-editor-shared.js'

export interface InfoboxTextEntry {
  type: 'text'
  id?: string
  label: string
  value: string
}

export interface InfoboxImageEntry {
  type: 'image'
  id?: string
  image: string
  caption: string
  /** Display width as a percentage of the infobox (1–100). Omit for full width. */
  size?: number
}

export type InfoboxEntry = InfoboxTextEntry | InfoboxImageEntry

export interface InfoboxData {
  templateName: string
  title: string
  entries: InfoboxEntry[]
}

export interface InfoboxMatch {
  data: InfoboxData
  start: number
  end: number
  raw: string
}

const INFOBOX_PATTERN = /\{\{(Infobox(?:\s+[A-Za-z]+)?)\|([^}]+)\}\}/g
const RESERVED_KEYS = new Set(['title', 'name', 'image', 'caption', ...TEMPLATE_ORDER_PARAM_KEYS])
const IMAGE_KEY_PATTERN = /^@img\d+(_cap|_size)?$/
const ROW_KEY_PATTERN = /^@row\d+(_label)?$/

function newEntryId(): string {
  return newEditorId('e')
}

function normalizeEntryIds(entries: InfoboxEntry[]): InfoboxEntry[] {
  return entries.map((entry) => (entry.id ? entry : { ...entry, id: newEntryId() }))
}

/**
 * Returns the default data for a new infobox block.
 * @param variant - Optional template variant, such as `Person` or `Country`.
 */
export function createDefaultInfobox(variant?: string): InfoboxData {
  const templateName = variant ? `Infobox ${variant}` : 'Infobox'
  return {
    templateName,
    title: variant === 'Person' ? 'Person' : variant === 'Country' ? 'Country' : 'Title',
    entries: [{ type: 'text', id: newEntryId(), label: 'Field', value: 'Value' }]
  }
}

/**
 * Returns a new empty text row entry.
 */
export function createTextEntry(): InfoboxTextEntry {
  return { type: 'text', id: newEntryId(), label: 'Field', value: '' }
}

/**
 * Returns a new empty image row entry.
 */
export function createImageEntry(): InfoboxImageEntry {
  return { type: 'image', id: newEntryId(), image: '', caption: '' }
}

function parseImageSize(value?: string): number | undefined {
  if (!value?.trim()) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) return undefined
  return parsed
}

/** Inline CSS for scaling an infobox image to a percentage of the box width. */
export function infoboxImageSizeStyle(size?: number): string | undefined {
  if (size == null || size >= 100) return undefined
  const clamped = Math.min(100, Math.max(1, Math.round(size)))
  return `width: ${clamped}%; max-width: ${clamped}%`
}

function infoboxImageSizeAttr(size?: number): string {
  const style = infoboxImageSizeStyle(size)
  if (!style || size == null) return ''
  const clamped = Math.min(100, Math.max(1, Math.round(size)))
  return ` style="${style}" data-size="${clamped}"`
}

/**
 * Prepares page markdown for reader rendering.
 * @param content - Raw page markdown source.
 */
export function normalizeInfoboxForRender(content: string): string {
  const orderFixed = content.replace(/\{\{(Infobox(?:\s+[A-Za-z]+)?\|[^}]+)\}\}/g, (match) =>
    match.replace(/\|__order__=/g, '|@order=')
  )
  return moveInfoboxToTop(orderFixed)
}

/**
 * Finds the first infobox template call in page markdown.
 * Ignores examples inside fenced or inline code blocks.
 * @param content - Full page markdown source.
 */
export function findInfoboxInContent(content: string): InfoboxMatch | null {
  INFOBOX_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INFOBOX_PATTERN.exec(content)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (isInsideCode(content, start, end)) continue

    return {
      data: parseInfoboxParamString(match[1], match[2]),
      start,
      end,
      raw: match[0]
    }
  }

  return null
}

/**
 * Moves the first infobox template call to the top of page markdown.
 * @param content - Full page markdown source.
 */
export function moveInfoboxToTop(content: string): string {
  const match = findInfoboxInContent(content)
  if (!match) return content

  const withoutInfobox = (content.slice(0, match.start) + content.slice(match.end))
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const infobox = match.raw.trim()
  return withoutInfobox ? `${infobox}\n\n${withoutInfobox}\n` : `${infobox}\n`
}

/**
 * Builds infobox data from flat template parameters.
 * @param params - Key/value pairs from the template parser.
 * @param templateName - Template name, such as `Infobox`.
 */
export function infoboxDataFromParams(
  params: Record<string, string>,
  templateName = 'Infobox'
): InfoboxData {
  const title = params.title ?? params.name ?? 'Info'

  const orderValue = orderParamFromRecord(params)
  if (orderValue) {
    const entries = orderValue
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => entryFromOrderToken(token, params))
      .filter((entry): entry is InfoboxEntry => entry !== null)

    return {
      templateName,
      title,
      entries: normalizeEntryIds(entries.length > 0 ? entries : [createTextEntry()])
    }
  }

  return parseInfoboxParamString(
    templateName,
    Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('|')
  )
}

/**
 * Replaces or inserts an infobox block in page markdown.
 * @param content - Full page markdown source.
 * @param data - Infobox fields to serialize.
 */
export function replaceInfoboxInContent(content: string, data: InfoboxData): string {
  const markdown = serializeInfobox(data)
  const existing = findInfoboxInContent(content)

  const updated = existing
    ? content.slice(0, existing.start) + markdown + content.slice(existing.end)
    : content.trimEnd()
      ? `${content.trimEnd()}\n\n${markdown}\n`
      : `${markdown}\n`

  return moveInfoboxToTop(updated)
}

/**
 * Removes the first infobox block from page markdown.
 * @param content - Full page markdown source.
 */
export function removeInfoboxFromContent(content: string): string {
  const existing = findInfoboxInContent(content)
  if (!existing) return content

  let updated = content.slice(0, existing.start) + content.slice(existing.end)
  updated = updated.replace(/\n{3,}/g, '\n\n')
  return updated.trimStart()
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
const BARE_URL_PATTERN = /https?:\/\/[^\s<>")\]]+/g

/** Renders URLs and markdown links inside infobox field values. */
export function renderInfoboxInlineValue(value: string): string {
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  MARKDOWN_LINK_PATTERN.lastIndex = 0
  while ((match = MARKDOWN_LINK_PATTERN.exec(value)) !== null) {
    result += escapeHtml(value.slice(lastIndex, match.index))
    result += `<a href="${escapeHtml(match[2])}" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`
    lastIndex = match.index + match[0].length
  }

  const tail = value.slice(lastIndex)
  let tailIndex = 0
  BARE_URL_PATTERN.lastIndex = 0
  while ((match = BARE_URL_PATTERN.exec(tail)) !== null) {
    result += escapeHtml(tail.slice(tailIndex, match.index))
    result += `<a href="${escapeHtml(match[0])}" rel="noopener noreferrer">${escapeHtml(match[0])}</a>`
    tailIndex = match.index + match[0].length
  }

  result += escapeHtml(tail.slice(tailIndex))
  return result
}

/**
 * Renders infobox data as Wikipedia-style HTML.
 * @param data - Structured infobox content.
 */
function renderInlineValue(value: string): string {
  return renderInfoboxInlineValue(value)
}

export function renderInfoboxHtml(data: InfoboxData): string {
  const parts: string[] = [`<div class="infobox-title">${escapeHtml(data.title)}</div>`]
  let textRows: string[] = []

  const flushTextRows = () => {
    if (textRows.length === 0) return
    parts.push(`<table class="infobox-data">
    <tbody>
      ${textRows.join('\n')}
    </tbody>
  </table>`)
    textRows = []
  }

  for (const entry of data.entries) {
    if (entry.type === 'image') {
      flushTextRows()
      if (!entry.image) continue
      parts.push(`<div class="infobox-image">
    <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.caption || data.title)}"${infoboxImageSizeAttr(entry.size)} />
    ${entry.caption ? `<div class="infobox-caption">${escapeHtml(entry.caption)}</div>` : ''}
  </div>`)
      continue
    }

    textRows.push(`<tr>
  <th scope="row">${escapeHtml(entry.label)}</th>
  <td>${renderInlineValue(entry.value)}</td>
</tr>`)
  }

  flushTextRows()

  return `<aside class="wiki-infobox not-prose">
  ${parts.join('\n  ')}
</aside>`
}

function entryFromOrderToken(token: string, params: Record<string, string>): InfoboxEntry | null {
  if (token.startsWith('@img')) {
    const size = parseImageSize(params[`${token}_size`])
    return {
      type: 'image',
      id: newEntryId(),
      image: params[token] ?? '',
      caption: params[`${token}_cap`] ?? '',
      ...(size !== undefined ? { size } : {})
    }
  }

  if (/^@row\d+$/.test(token)) {
    return {
      type: 'text',
      id: newEntryId(),
      label: params[`${token}_label`] ?? 'Field',
      value: params[token] ?? ''
    }
  }

  return { type: 'text', id: newEntryId(), label: token, value: params[token] ?? '' }
}

function parseInfoboxParamString(templateName: string, paramString: string): InfoboxData {
  const parts = splitTemplateParamString(paramString)
  const params = partsToParamRecord(parts)
  const title = params.title ?? params.name ?? 'Info'

  const orderValue = orderParamFromRecord(params)
  if (orderValue) {
    const entries = orderValue
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => entryFromOrderToken(token, params))
      .filter((entry): entry is InfoboxEntry => entry !== null)

    return {
      templateName,
      title,
      entries: normalizeEntryIds(entries.length > 0 ? entries : [createTextEntry()])
    }
  }

  const entries: InfoboxEntry[] = []

  for (const part of parts) {
    const equalsIndex = part.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = part.slice(0, equalsIndex).trim()
    const value = decodeTemplateParamValue(part.slice(equalsIndex + 1).trim())

    if (
      key === 'title' ||
      key === 'name' ||
      TEMPLATE_ORDER_PARAM_KEYS.includes(key as (typeof TEMPLATE_ORDER_PARAM_KEYS)[number])
    )
      continue
    if (ROW_KEY_PATTERN.test(key)) continue

    if (key === 'image') {
      entries.push({ type: 'image', image: value, caption: '' })
      continue
    }

    if (key === 'caption') {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry?.type === 'image') lastEntry.caption = value
      continue
    }

    if (/^@img\d+$/.test(key)) {
      entries.push({ type: 'image', image: value, caption: '' })
      continue
    }

    if (/^@img\d+_cap$/.test(key)) {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry?.type === 'image') lastEntry.caption = value
      continue
    }

    if (/^@img\d+_size$/.test(key)) {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry?.type === 'image') {
        const size = parseImageSize(value)
        if (size !== undefined) lastEntry.size = size
      }
      continue
    }

    if (!RESERVED_KEYS.has(key) && !IMAGE_KEY_PATTERN.test(key)) {
      entries.push({ type: 'text', label: key, value })
    }
  }

  return {
    templateName,
    title,
    entries: normalizeEntryIds(entries.length > 0 ? entries : [createTextEntry()])
  }
}

function serializeInfobox(data: InfoboxData): string {
  const parts = [data.title ? `title=${data.title}` : '']
  const order: string[] = []
  let textIndex = 0
  let imageIndex = 0

  for (const entry of data.entries) {
    if (entry.type === 'text') {
      const rowKey = `@row${textIndex++}`
      order.push(rowKey)
      parts.push(`${rowKey}_label=${entry.label}`)
      parts.push(`${rowKey}=${entry.value}`)
      continue
    }

    const imageKey = `@img${imageIndex++}`
    order.push(imageKey)
    parts.push(`${imageKey}=${entry.image}`)
    if (entry.caption) parts.push(`${imageKey}_cap=${entry.caption}`)
    if (entry.size != null && entry.size < 100) parts.push(`${imageKey}_size=${entry.size}`)
  }

  if (order.length > 0) parts.push(`@order=${order.join(',')}`)

  return `{{${data.templateName}|${parts.filter(Boolean).join('|')}}}`
}

/** Returns true when a span lies inside fenced or inline code. */
export function isInsideCode(content: string, start: number, end: number): boolean {
  if (isInsideFencedCode(content, start)) return true
  return isInsideInlineCode(content, start, end)
}

function isInsideFencedCode(content: string, index: number): boolean {
  const fencePattern = /^(`{3,})(.*)?$/gm
  let inFence = false
  let fenceStart = 0
  let match: RegExpExecArray | null

  while ((match = fencePattern.exec(content)) !== null) {
    if (!inFence) {
      fenceStart = match.index
      inFence = true
    } else {
      const fenceEnd = match.index + match[0].length
      if (index >= fenceStart && index < fenceEnd) return true
      inFence = false
    }
  }

  return inFence && index >= fenceStart
}

function isInsideInlineCode(content: string, start: number, end: number): boolean {
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  const lineEndIndex = content.indexOf('\n', end)
  const line = content.slice(lineStart, lineEndIndex === -1 ? undefined : lineEndIndex)
  const relStart = start - lineStart
  const relEnd = end - lineStart

  let index = 0
  while (index < line.length) {
    if (line[index] !== '`') {
      index++
      continue
    }

    const close = line.indexOf('`', index + 1)
    if (close === -1) break
    if (relStart >= index && relEnd <= close + 1) return true
    index = close + 1
  }

  return false
}
