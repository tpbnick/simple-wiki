import { escapeHtml } from '$lib/html.js'
import { isInsideCode } from './infobox-editor.js'
import { renderWikiInlineMarkdown } from '$lib/markdown/inline.js'
import {
  encodeTemplateParamValue,
  partsToParamRecord,
  splitTemplateParamString
} from '$lib/templates/param-string.js'
import {
  newEditorId,
  orderParamFromRecord,
  TEMPLATE_ORDER_PARAM_KEYS
} from '$lib/templates/template-editor-shared.js'

export interface ImageBoxItem {
  id?: string
  image: string
  caption: string
}

export interface ImageBoxData {
  id: string
  images: ImageBoxItem[]
  columns: number
}

export interface ImageBoxMatch {
  data: ImageBoxData
  start: number
  end: number
  raw: string
}

const IMAGEBOX_PATTERN = /\{\{ImageBox\|([^}]+)\}\}/g
const IMAGE_KEY_PATTERN = /^@img\d+(_cap)?$/
const DEFAULT_COLUMNS = 4
/** Captions at or above this length use at most two images per row. */
export const LONG_CAPTION_CHARS = 48

function newItemId(): string {
  return newEditorId('i')
}

export function newImageBoxId(): string {
  return newEditorId('ib')
}

function normalizeItemIds(items: ImageBoxItem[]): ImageBoxItem[] {
  return items.map((item) => (item.id ? item : { ...item, id: newItemId() }))
}

function orderParamValue(params: Record<string, string>): string | undefined {
  return orderParamFromRecord(params)
}

function parseColumns(value?: string): number {
  if (!value?.trim()) return DEFAULT_COLUMNS
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return DEFAULT_COLUMNS
  return Math.min(4, Math.max(1, parsed))
}

function splitParamParts(paramString: string): string[] {
  return splitTemplateParamString(paramString)
}

function partsToRecord(parts: string[]): Record<string, string> {
  return partsToParamRecord(parts)
}

function imageFromOrderToken(token: string, params: Record<string, string>): ImageBoxItem {
  return {
    id: newItemId(),
    image: params[token] ?? '',
    caption: params[`${token}_cap`] ?? ''
  }
}

function parseImageBoxParamString(paramString: string): ImageBoxData {
  const parts = splitParamParts(paramString)
  const params = partsToRecord(parts)
  const id = params['@id'] ?? newImageBoxId()
  const columns = parseColumns(params.columns)

  const orderValue = orderParamValue(params)
  if (orderValue) {
    const images = orderValue
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.startsWith('@img'))
      .map((token) => imageFromOrderToken(token, params))

    return {
      id,
      columns,
      images: normalizeItemIds(images.length > 0 ? images : [createImageBoxItem()])
    }
  }

  const images: ImageBoxItem[] = []

  for (const part of parts) {
    const equalsIndex = part.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = part.slice(0, equalsIndex).trim()
    const value = part.slice(equalsIndex + 1).trim()

    if (
      key === '@id' ||
      key === 'columns' ||
      TEMPLATE_ORDER_PARAM_KEYS.includes(key as (typeof TEMPLATE_ORDER_PARAM_KEYS)[number])
    )
      continue
    if (IMAGE_KEY_PATTERN.test(key)) continue

    if (/^@img\d+$/.test(key)) {
      images.push({ id: newItemId(), image: value, caption: '' })
      continue
    }

    if (/^@img\d+_cap$/.test(key)) {
      const last = images[images.length - 1]
      if (last) last.caption = value
    }
  }

  return {
    id,
    columns,
    images: normalizeItemIds(images.length > 0 ? images : [createImageBoxItem()])
  }
}

export function createImageBoxItem(): ImageBoxItem {
  return { id: newItemId(), image: '', caption: '' }
}

export function createDefaultImageBox(): ImageBoxData {
  return {
    id: newImageBoxId(),
    columns: DEFAULT_COLUMNS,
    images: [createImageBoxItem()]
  }
}

export function imageBoxDataFromParams(params: Record<string, string>): ImageBoxData {
  return parseImageBoxParamString(
    Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('|')
  )
}

export function findAllImageBoxesInContent(content: string): ImageBoxMatch[] {
  IMAGEBOX_PATTERN.lastIndex = 0
  const matches: ImageBoxMatch[] = []
  let match: RegExpExecArray | null

  while ((match = IMAGEBOX_PATTERN.exec(content)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (isInsideCode(content, start, end)) continue

    matches.push({
      data: parseImageBoxParamString(match[1]),
      start,
      end,
      raw: match[0]
    })
  }

  return matches
}

export function serializeImageBox(data: ImageBoxData): string {
  const parts = [`@id=${data.id}`, `columns=${data.columns}`]
  const order: string[] = []
  let imageIndex = 0

  for (const item of data.images) {
    const imageKey = `@img${imageIndex++}`
    order.push(imageKey)
    parts.push(`${imageKey}=${encodeTemplateParamValue(item.image)}`)
    if (item.caption) parts.push(`${imageKey}_cap=${encodeTemplateParamValue(item.caption)}`)
  }

  if (order.length > 0) parts.push(`@order=${order.join(',')}`)

  return `{{ImageBox|${parts.join('|')}}}`
}

export function replaceImageBoxInContent(content: string, id: string, data: ImageBoxData): string {
  const markdown = serializeImageBox({ ...data, id })
  const matches = findAllImageBoxesInContent(content)
  const target = matches.find((match) => match.data.id === id)

  if (!target) {
    return content.trimEnd() ? `${content.trimEnd()}\n\n${markdown}\n` : `${markdown}\n`
  }

  return content.slice(0, target.start) + markdown + content.slice(target.end)
}

export function removeImageBoxFromContent(content: string, id: string): string {
  const matches = findAllImageBoxesInContent(content)
  const target = matches.find((match) => match.data.id === id)
  if (!target) return content

  let updated = content.slice(0, target.start) + content.slice(target.end)
  updated = updated.replace(/\n{3,}/g, '\n\n')
  return updated.trim()
}

export function removeAllImageBoxesFromContent(content: string): string {
  const matches = findAllImageBoxesInContent(content)
  if (matches.length === 0) return content

  let updated = content
  for (const match of [...matches].reverse()) {
    updated = updated.slice(0, match.start) + updated.slice(match.end)
  }

  return updated.replace(/\n{3,}/g, '\n\n').trim()
}

export function imageFilename(url: string): string {
  if (!url) return ''
  const path = url.split('?')[0]
  const name = path.slice(path.lastIndexOf('/') + 1)
  return name || url
}

export function hasLongCaptions(data: ImageBoxData): boolean {
  return data.images.some((item) => item.caption.trim().length >= LONG_CAPTION_CHARS)
}

/** Returns the configured column count (1–4). */
export function effectiveImageBoxColumns(data: ImageBoxData): number {
  return parseColumns(String(data.columns))
}

function captionAltText(caption: string): string {
  return caption
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Renders caption newlines: single breaks as <br>, blank lines as paragraph gaps. */
export function renderImageBoxCaption(caption: string): string {
  const trimmed = caption.trim()
  if (!trimmed) return ''

  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => renderWikiInlineMarkdown(line))
        .join('<br />')
      return `<span class="imagebox-caption-block">${lines}</span>`
    })
    .join('')
}

export function normalizeImageBoxForRender(content: string): string {
  let updated = content
  const matches = findAllImageBoxesInContent(content)

  for (const match of [...matches].reverse()) {
    const fixed = serializeImageBox(match.data)
    if (fixed === match.raw) continue
    updated = updated.slice(0, match.start) + fixed + updated.slice(match.end)
  }

  return updated
}

export function renderImageBoxHtml(data: ImageBoxData): string {
  const columns = effectiveImageBoxColumns(data)
  const longCaptions = hasLongCaptions(data)
  const items = data.images.filter((item) => item.image)

  if (items.length === 0) {
    return `<figure class="wiki-imagebox not-prose" data-id="${escapeHtml(data.id)}"><div class="imagebox-empty">Image box</div></figure>`
  }

  const cells = items
    .map(
      (item) => `<figure class="imagebox-item">
    <div class="imagebox-media">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(captionAltText(item.caption) || imageFilename(item.image))}" loading="lazy" />
    </div>
    ${item.caption.trim() ? `<figcaption class="imagebox-caption">${renderImageBoxCaption(item.caption)}</figcaption>` : ''}
  </figure>`
    )
    .join('\n    ')

  const longClass = longCaptions ? ' imagebox-long-captions' : ''

  return `<figure class="wiki-imagebox not-prose${longClass}" data-id="${escapeHtml(data.id)}">
  <div class="imagebox-grid" style="--imagebox-cols: ${columns}; grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
    ${cells}
  </div>
</figure>`
}
