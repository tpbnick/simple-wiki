import type { FamilyTreeData, FamilyTreePerson } from './types.js'
import { comparePeopleByBirthThenName } from './name.js'

export function createPersonId(): string {
  return crypto.randomUUID()
}

export function createPerson(name = 'New person'): FamilyTreePerson {
  return {
    id: createPersonId(),
    name,
    parentIds: []
  }
}

export function createEmptyTree(title: string): FamilyTreeData {
  const root = createPerson(title)
  return {
    rootId: root.id,
    people: { [root.id]: root }
  }
}

export function getPerson(data: FamilyTreeData, id: string): FamilyTreePerson | null {
  return data.people[id] ?? null
}

export function updatePerson(
  data: FamilyTreeData,
  id: string,
  patch: Partial<Pick<FamilyTreePerson, 'name' | 'birthYear' | 'deathYear' | 'imageUrl'>>
): FamilyTreeData {
  const person = data.people[id]
  if (!person) return data

  return {
    ...data,
    people: {
      ...data.people,
      [id]: {
        ...person,
        ...patch,
        name: patch.name?.trim() || person.name
      }
    }
  }
}

function linkSpouses(
  a: FamilyTreePerson,
  b: FamilyTreePerson
): [FamilyTreePerson, FamilyTreePerson] {
  return [
    { ...a, spouseId: b.id },
    { ...b, spouseId: a.id }
  ]
}

/** When a child gains a second parent, link the two parents as spouses if the first has none. */
function linkParentsAsSpousesIfNeeded(
  people: FamilyTreeData['people'],
  child: FamilyTreePerson,
  newParentId: string
): FamilyTreeData['people'] {
  if (child.parentIds.length !== 1) return people

  const existingParentId = child.parentIds[0]
  if (existingParentId === newParentId) return people

  const existingParent = people[existingParentId]
  const newParent = people[newParentId]
  if (!existingParent || !newParent || existingParent.spouseId) return people

  const [updatedExisting, updatedNew] = linkSpouses(existingParent, newParent)
  return {
    ...people,
    [existingParentId]: updatedExisting,
    [newParentId]: updatedNew
  }
}

/** Whether an existing person can be added to a child's parentIds. */
export function canLinkParent(data: FamilyTreeData, childId: string, parentId: string): boolean {
  const child = data.people[childId]
  const parent = data.people[parentId]
  if (!child || !parent) return false
  if (child.parentIds.length >= 2) return false
  if (child.parentIds.includes(parentId)) return false
  if (childId === parentId || child.spouseId === parentId) return false
  if (isDescendantOf(data, childId, parentId)) return false
  return true
}

/** Adds a spouse node beside the given person. */
export function addSpouse(data: FamilyTreeData, personId: string, name = 'Spouse'): FamilyTreeData {
  const person = data.people[personId]
  if (!person || person.spouseId) return data

  const spouse = createPerson(name)
  const [updatedPerson, updatedSpouse] = linkSpouses(person, spouse)

  return {
    ...data,
    people: {
      ...data.people,
      [personId]: updatedPerson,
      [spouse.id]: updatedSpouse
    }
  }
}

/** Adds a child beneath a person (and their spouse, when present). */
export function addChild(data: FamilyTreeData, parentId: string, name = 'Child'): FamilyTreeData {
  const parent = data.people[parentId]
  if (!parent) return data

  const parentIds = parent.spouseId ? [parent.id, parent.spouseId] : [parent.id]
  const child = { ...createPerson(name), parentIds }

  return {
    ...data,
    people: {
      ...data.people,
      [child.id]: child
    }
  }
}

/** Adds a parent above a person (links spouses when adding a second parent). */
export function addParent(data: FamilyTreeData, childId: string, name = 'Parent'): FamilyTreeData {
  const child = data.people[childId]
  if (!child || child.parentIds.length >= 2) return data

  const parent = createPerson(name)

  if (child.parentIds.length === 0) {
    return {
      ...data,
      people: {
        ...data.people,
        [parent.id]: parent,
        [childId]: { ...child, parentIds: [parent.id] }
      }
    }
  }

  const existingParentId = child.parentIds[0]
  const existingParent = data.people[existingParentId]
  if (!existingParent) return data

  let people: FamilyTreeData['people'] = {
    ...data.people,
    [parent.id]: parent
  }

  if (!existingParent.spouseId) {
    people = linkParentsAsSpousesIfNeeded(people, child, parent.id)
    return {
      ...data,
      people: {
        ...people,
        [childId]: { ...child, parentIds: [existingParentId, parent.id] }
      }
    }
  }

  return {
    ...data,
    people: {
      ...people,
      [childId]: { ...child, parentIds: [...child.parentIds, parent.id] }
    }
  }
}

/** Returns true when `candidateId` is the same person or a descendant of `personId`. */
export function isDescendantOf(
  data: FamilyTreeData,
  personId: string,
  candidateId: string
): boolean {
  if (personId === candidateId) return true

  const queue = [personId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.pop()!
    if (visited.has(id)) continue
    visited.add(id)

    for (const person of Object.values(data.people)) {
      if (!person.parentIds.includes(id)) continue
      if (person.id === candidateId) return true
      queue.push(person.id)
    }
  }

  return false
}

/** People who can be linked as a parent for the given child (excludes invalid/cyclic choices). */
export function listLinkableParents(data: FamilyTreeData, childId: string): FamilyTreePerson[] {
  const child = data.people[childId]
  if (!child || child.parentIds.length >= 2) return []

  return Object.values(data.people)
    .filter((person) => canLinkParent(data, childId, person.id))
    .sort(comparePeopleByBirthThenName)
}

/** Links an existing person as a parent of the given child. */
export function linkParent(
  data: FamilyTreeData,
  childId: string,
  parentId: string
): FamilyTreeData {
  if (!canLinkParent(data, childId, parentId)) return data

  const child = data.people[childId]
  let people = linkParentsAsSpousesIfNeeded({ ...data.people }, child, parentId)

  people[childId] = {
    ...child,
    parentIds: [...child.parentIds, parentId]
  }

  return { ...data, people }
}

/** Removes a person from the tree and unlinks them from relatives. Descendants are kept. */
export function removePerson(data: FamilyTreeData, personId: string): FamilyTreeData {
  if (personId === data.rootId) return data

  const person = data.people[personId]
  if (!person) return data

  const people = { ...data.people }

  if (person.spouseId && people[person.spouseId]) {
    people[person.spouseId] = { ...people[person.spouseId], spouseId: undefined }
  }

  for (const other of Object.values(people)) {
    if (other.parentIds.includes(personId)) {
      people[other.id] = {
        ...other,
        parentIds: other.parentIds.filter((parent) => parent !== personId)
      }
    }
  }

  delete people[personId]

  return { ...data, people }
}
