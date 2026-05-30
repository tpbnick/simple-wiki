export type DiffLine =
  | { type: 'same'; text: string }
  | { type: 'remove'; text: string }
  | { type: 'add'; text: string }

function splitLines(text: string): string[] {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').split('\n')
}

/** Longest-common-subsequence table for line arrays. */
function lcsTable(a: string[], b: string[]): number[][] {
  const rows = a.length + 1
  const cols = b.length + 1
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
      }
    }
  }

  return table
}

/**
 * Returns a GitHub-style line diff between two text blobs.
 * Compares whole lines (markdown source).
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)
  const table = lcsTable(oldLines, newLines)
  const result: DiffLine[] = []

  let i = oldLines.length
  let j = newLines.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'same', text: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.push({ type: 'add', text: newLines[j - 1] })
      j--
    } else if (i > 0) {
      result.push({ type: 'remove', text: oldLines[i - 1] })
      i--
    }
  }

  result.reverse()
  return result
}

/** Returns only added and removed lines from a diff. */
export function changedLinesOnly(diff: DiffLine[]): Array<DiffLine & { type: 'add' | 'remove' }> {
  return diff.filter((line): line is DiffLine & { type: 'add' | 'remove' } => line.type !== 'same')
}

/** Skip LCS when either side exceeds this many lines (diff is expensive on huge pages). */
export const MAX_DIFF_INPUT_LINES = 2000

/** Maximum changed lines returned inline before marking the diff as too large. */
export const MAX_DIFF_OUTPUT_LINES = 200

/** User-facing message when a diff exceeds {@link MAX_DIFF_OUTPUT_LINES}. */
export const DIFF_TOO_LARGE_MESSAGE = `Diff too large to display inline (over ${MAX_DIFF_OUTPUT_LINES} changed lines).`

export type ChangedDiffLine = DiffLine & { type: 'add' | 'remove' }

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

/** Builds a changed-line diff, marking oversized results as too large to display inline. */
export function buildChangedLineDiff(
  oldText: string,
  newText: string
): { lines: ChangedDiffLine[]; tooLarge?: boolean } {
  if (normalizeText(oldText) === normalizeText(newText)) {
    return { lines: [] }
  }

  const oldLineCount = splitLines(oldText).length
  const newLineCount = splitLines(newText).length
  if (oldLineCount > MAX_DIFF_INPUT_LINES || newLineCount > MAX_DIFF_INPUT_LINES) {
    return { lines: [], tooLarge: true }
  }

  const lines = changedLinesOnly(diffLines(oldText, newText))
  if (lines.length > MAX_DIFF_OUTPUT_LINES) {
    return { lines: [], tooLarge: true }
  }

  return { lines }
}

/**
 * Content after a stored revision was superseded.
 * Revisions are ordered newest-first; index 0 compares against the live page.
 */
export function newerRevisionContent(
  revisions: Array<{ content: string }>,
  index: number,
  currentContent: string
): string {
  return index === 0 ? currentContent : revisions[index - 1].content
}

/**
 * Page title after a stored revision was superseded.
 * Revisions are ordered newest-first; index 0 compares against the live page.
 */
export function newerRevisionTitle(
  revisions: Array<{ title: string | null }>,
  index: number,
  currentTitle: string
): string {
  if (index === 0) return currentTitle
  return revisions[index - 1].title ?? currentTitle
}
