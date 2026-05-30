import type { FamilyTreeData, FamilyTreePerson } from './types.js'

export interface PaternalLineage {
  personIds: Set<string>
  /** Child ids whose parent-child connector should highlight on the way up. */
  childEdgeIds: Set<string>
}

/** Walks the tree upward through each person's first parent (paternal line). */
export function getPaternalLineage(personId: string, data: FamilyTreeData): PaternalLineage {
  const personIds = new Set<string>()
  const childEdgeIds = new Set<string>()

  let current: string | undefined = personId
  while (current) {
    personIds.add(current)
    const person: FamilyTreePerson | undefined = data.people[current]
    if (!person) break

    const parentId: string | undefined = person.parentIds[0]
    if (!parentId || !data.people[parentId]) break

    childEdgeIds.add(current)
    current = parentId
  }

  return { personIds, childEdgeIds }
}
