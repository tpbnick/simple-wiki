export function wrapSelection(
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (next: string) => void,
  before: string,
  after = before,
  placeholder = 'text'
): void {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.slice(start, end) || placeholder
  const replacement = before + selected + after
  setContent(content.slice(0, start) + replacement + content.slice(end))
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

export function insertAtSelection(
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (next: string) => void,
  text: string
): void {
  const start = textarea.selectionStart
  setContent(content.slice(0, start) + text + content.slice(start))
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + text.length, start + text.length)
  })
}

export function handleTabKey(
  event: KeyboardEvent,
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (next: string) => void
): void {
  if (event.key !== 'Tab') return
  event.preventDefault()
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  if (event.shiftKey) {
    const before = content.slice(0, start)
    const trimmed = before.replace(/  $/, '')
    if (trimmed.length < before.length) {
      const removed = before.length - trimmed.length
      setContent(trimmed + content.slice(start))
      setTimeout(() => textarea.setSelectionRange(start - removed, end - removed))
    }
  } else {
    setContent(content.slice(0, start) + '  ' + content.slice(end))
    setTimeout(() => textarea.setSelectionRange(start + 2, start + 2))
  }
}
