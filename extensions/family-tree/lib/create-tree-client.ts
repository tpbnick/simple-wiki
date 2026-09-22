import type { FamilyTreeData } from './types.js'
import { validateFamilyTreeData } from './validate.js'

export function parseCreatedFamilyTree(payload: unknown): {
  slug: string
  title: string
  data: FamilyTreeData
} {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Could not create family tree')
  }

  const record = payload as Record<string, unknown>
  if (typeof record.slug !== 'string' || typeof record.title !== 'string') {
    throw new Error('Could not create family tree')
  }

  const validation = validateFamilyTreeData(record.data)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  return { slug: record.slug, title: record.title, data: validation.data }
}

/** Creates a family tree via the wiki API. */
export async function createFamilyTree(title: string): Promise<{
  slug: string
  title: string
  data: FamilyTreeData
}> {
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

  return parseCreatedFamilyTree(await response.json())
}
