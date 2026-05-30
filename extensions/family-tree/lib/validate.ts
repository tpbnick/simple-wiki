import type { FamilyTreeData, FamilyTreePerson } from './types.js'

export type FamilyTreeValidationResult =
  | { ok: true; data: FamilyTreeData }
  | { ok: false; message: string }

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//')
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isPerson(value: unknown): value is FamilyTreePerson {
  if (!value || typeof value !== 'object') return false
  const person = value as Partial<FamilyTreePerson>
  return typeof person.id === 'string' && typeof person.name === 'string' && Array.isArray(person.parentIds)
}

/** Validates parsed tree JSON before rendering or saving. */
export function validateFamilyTreeData(data: unknown): FamilyTreeValidationResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, message: 'Tree data is missing or not a valid object.' }
  }

  const record = data as Partial<FamilyTreeData>
  if (typeof record.rootId !== 'string' || !record.rootId.trim()) {
    return { ok: false, message: 'Tree data is corrupt: missing root person id.' }
  }

  if (!record.people || typeof record.people !== 'object') {
    return { ok: false, message: 'Tree data is corrupt: missing people records.' }
  }

  const root = record.people[record.rootId]
  if (!isPerson(root)) {
    return { ok: false, message: 'Tree data is corrupt: root person is missing or invalid.' }
  }

  for (const [id, person] of Object.entries(record.people)) {
    if (!isPerson(person)) {
      return { ok: false, message: `Tree data is corrupt: person "${id}" is invalid.` }
    }
    if (person.id !== id) {
      return { ok: false, message: `Tree data is corrupt: person "${id}" has a mismatched id.` }
    }
    for (const parentId of person.parentIds) {
      if (typeof parentId !== 'string' || !record.people[parentId]) {
        return { ok: false, message: `Tree data is corrupt: person "${id}" references a missing parent.` }
      }
    }
    if (person.spouseId && !record.people[person.spouseId]) {
      return { ok: false, message: `Tree data is corrupt: person "${id}" references a missing spouse.` }
    }
    if (person.imageUrl !== undefined && person.imageUrl !== '' && !isSafeImageUrl(person.imageUrl)) {
      return { ok: false, message: `Tree data is corrupt: person "${id}" has an unsafe image URL.` }
    }
  }

  return { ok: true, data: record as FamilyTreeData }
}
