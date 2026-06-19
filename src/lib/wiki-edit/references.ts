/**
 * Inserts a self-contained inline reference at the cursor.
 * Display numbers are assigned automatically when the page renders.
 */
export function insertReference(
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (next: string) => void
): void {
  const placeholder = 'Source text or [label](url)'
  const marker = `[^: ${placeholder}]`
  const cursor = textarea.selectionStart
  const next = content.slice(0, cursor) + marker + content.slice(cursor)

  setContent(next)

  setTimeout(() => {
    textarea.focus()
    const valueStart = cursor + '[^: '.length
    textarea.setSelectionRange(valueStart, valueStart + placeholder.length)
  })
}
