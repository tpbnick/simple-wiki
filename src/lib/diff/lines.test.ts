import { describe, expect, it } from 'vitest'
import {
  buildChangedLineDiff,
  changedLinesOnly,
  DIFF_TOO_LARGE_MESSAGE,
  diffLines,
  MAX_DIFF_OUTPUT_LINES,
  newerRevisionContent,
  newerRevisionTitle
} from '$lib/diff/lines.js'

describe('diffLines', () => {
  it('marks removed and added lines', () => {
    const diff = changedLinesOnly(diffLines('alpha\nbeta\ngamma', 'alpha\ndelta\ngamma'))

    expect(diff).toEqual([
      { type: 'remove', text: 'beta' },
      { type: 'add', text: 'delta' }
    ])
  })

  it('handles appended lines', () => {
    const diff = changedLinesOnly(diffLines('one', 'one\ntwo'))

    expect(diff).toEqual([{ type: 'add', text: 'two' }])
  })

  it('handles deleted lines', () => {
    const diff = changedLinesOnly(diffLines('one\ntwo', 'one'))

    expect(diff).toEqual([{ type: 'remove', text: 'two' }])
  })
})

describe('buildChangedLineDiff', () => {
  it('returns no changes immediately when content is identical', () => {
    const content = Array.from({ length: 2500 }, (_, index) => `line-${index}`).join('\n')

    const result = buildChangedLineDiff(content, content)

    expect(result).toEqual({ lines: [] })
  })

  it('marks diffs over 200 changed lines as too large', () => {
    const oldContent = Array.from({ length: 250 }, (_, index) => `line-${index}`).join('\n')
    const newContent = Array.from({ length: 250 }, (_, index) => `changed-${index}`).join('\n')

    const result = buildChangedLineDiff(oldContent, newContent)

    expect(result.tooLarge).toBe(true)
    expect(result.lines).toEqual([])
  })

  it('exports a user-facing too-large message tied to the output limit', () => {
    expect(DIFF_TOO_LARGE_MESSAGE).toContain(String(MAX_DIFF_OUTPUT_LINES))
  })
})

describe('newerRevisionContent', () => {
  it('uses current page content for the newest stored revision', () => {
    const revisions = [{ content: 'old' }, { content: 'older' }]
    expect(newerRevisionContent(revisions, 0, 'live')).toBe('live')
    expect(newerRevisionContent(revisions, 1, 'live')).toBe('old')
  })
})

describe('newerRevisionTitle', () => {
  it('uses current page title for the newest stored revision', () => {
    const revisions = [
      { title: 'Old', content: '' },
      { title: 'Older', content: '' }
    ]
    expect(newerRevisionTitle(revisions, 0, 'Live')).toBe('Live')
    expect(newerRevisionTitle(revisions, 1, 'Live')).toBe('Old')
  })
})
