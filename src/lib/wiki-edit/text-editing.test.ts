import { describe, expect, it, vi } from 'vitest'
import { insertAtSelection, wrapSelection } from './text-editing.js'

function fakeTextarea(start: number, end = start) {
  return {
    selectionStart: start,
    selectionEnd: end,
    focus: vi.fn(),
    setSelectionRange: vi.fn()
  } as unknown as HTMLTextAreaElement
}

describe('text-editing helpers', () => {
  it('insertAtSelection inserts at the cursor', () => {
    let content = 'hello world'
    const textarea = fakeTextarea(5)
    insertAtSelection(textarea, content, (next) => { content = next }, ' brave')
    expect(content).toBe('hello brave world')
  })

  it('wrapSelection wraps the current selection', () => {
    let content = 'hello world'
    const textarea = fakeTextarea(0, 5)
    wrapSelection(textarea, content, (next) => { content = next }, '**')
    expect(content).toBe('**hello** world')
  })
})
