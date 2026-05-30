import { personDisplayName } from './name.js'
import type { FamilyTreePerson } from './types.js'
import { NODE_HEIGHT, NODE_WIDTH } from './types.js'

/** Layout metrics mirrored from `.ft-node` styles in app.css (16px root). */
const NODE_PADDING_Y = 10.4
const NODE_PADDING_X = 8
const NODE_INNER_GAP = 5.6
const PHOTO_HEIGHT = 52
const NAME_LINE_HEIGHT = 17
const YEARS_LINE_HEIGHT = 14
const NAME_CHAR_WIDTH = 7.2
const NAME_CONTENT_WIDTH = NODE_WIDTH - NODE_PADDING_X * 2

function linesForToken(token: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(token.length / charsPerLine))
}

/** Estimates wrapped name lines using the same width the node renders at. */
export function countNameLines(name: string): number {
  const text = personDisplayName(name).trim()
  if (!text) return 1

  const charsPerLine = Math.max(1, Math.floor(NAME_CONTENT_WIDTH / NAME_CHAR_WIDTH))
  const tokens = text.split(/\s+/).filter(Boolean)
  let lines = 1
  let lineChars = 0

  for (const token of tokens) {
    const tokenLines = linesForToken(token, charsPerLine)
    if (tokenLines > 1) {
      if (lineChars > 0) lines++
      lines += tokenLines - 1
      lineChars = token.length % charsPerLine || charsPerLine
      continue
    }

    const nextChars = lineChars === 0 ? token.length : lineChars + 1 + token.length
    if (nextChars <= charsPerLine) {
      lineChars = nextChars
      continue
    }

    lines++
    lineChars = token.length
  }

  return lines
}

/** Approximates rendered card height so connectors clear multi-line names. */
export function estimateNodeHeight(person: FamilyTreePerson): number {
  const nameLines = countNameLines(person.name)
  const hasYears = Boolean(person.birthYear?.trim() || person.deathYear?.trim())

  let height =
    NODE_PADDING_Y * 2 + PHOTO_HEIGHT + NODE_INNER_GAP + nameLines * NAME_LINE_HEIGHT

  if (hasYears) {
    height += NODE_INNER_GAP + YEARS_LINE_HEIGHT
  }

  return Math.max(NODE_HEIGHT, Math.ceil(height))
}
