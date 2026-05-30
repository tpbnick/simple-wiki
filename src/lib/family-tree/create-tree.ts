/** Creates a family tree via the wiki API. */
export async function createFamilyTree(title: string): Promise<{ slug: string; title: string }> {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Tree name is required')
  }

  const response = await fetch('/api/family-tree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: trimmed })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message ?? 'Could not create family tree')
  }

  return response.json()
}
