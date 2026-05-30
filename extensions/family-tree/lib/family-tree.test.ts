import { describe, expect, it } from 'vitest'
import { addChild, addParent, addSpouse, createEmptyTree, getPerson, linkParent, listLinkableParents, removePerson } from './model.js'
import { layoutFamilyTree } from './layout.js'
import { NODE_HEIGHT } from './types.js'

describe('family tree model', () => {
  it('adds spouses and children', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId

    data = addSpouse(data, rootId, 'Partner')
    const spouseId = getPerson(data, rootId)?.spouseId
    expect(spouseId).toBeTruthy()

    data = addChild(data, rootId, 'Child')
    const child = Object.values(data.people).find((person) => person.name === 'Child')
    expect(child?.parentIds.sort()).toEqual([rootId, spouseId!].sort())
  })

  it('adds parents above a person', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId

    data = addParent(data, rootId, 'Father')
    const father = Object.values(data.people).find((person) => person.name === 'Father')
    expect(father).toBeTruthy()
    expect(getPerson(data, rootId)?.parentIds).toEqual([father!.id])

    data = addParent(data, rootId, 'Mother')
    const mother = Object.values(data.people).find((person) => person.name === 'Mother')
    expect(getPerson(data, rootId)?.parentIds.sort()).toEqual([father!.id, mother!.id].sort())
    expect(getPerson(data, father!.id)?.spouseId).toBe(mother!.id)
  })

  it('adds a parent above a descendant without changing rootId', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId
    data = addChild(data, rootId, 'Child')
    const childId = Object.values(data.people).find((person) => person.name === 'Child')!.id

    data = addParent(data, childId, 'Earlier ancestor')
    const ancestor = Object.values(data.people).find((person) => person.name === 'Earlier ancestor')

    expect(data.rootId).toBe(rootId)
    expect(getPerson(data, childId)?.parentIds).toContain(ancestor!.id)
  })

  it('removes a parent without deleting descendants', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId
    data = addParent(data, rootId, 'Parent')
    data = addChild(data, rootId, 'Child')

    const parentId = Object.values(data.people).find((person) => person.name === 'Parent')!.id
    data = removePerson(data, parentId)

    expect(Object.keys(data.people)).toHaveLength(2)
    expect(getPerson(data, rootId)).toBeTruthy()
    expect(getPerson(data, rootId)?.parentIds).toEqual([])
    expect(Object.values(data.people).find((person) => person.name === 'Child')).toBeTruthy()
  })

  it('removes a leaf child without affecting the rest of the tree', () => {
    let data = createEmptyTree('Root')
    data = addChild(data, data.rootId, 'Child')

    const childId = Object.values(data.people).find((person) => person.name === 'Child')!.id
    data = removePerson(data, childId)

    expect(Object.keys(data.people)).toHaveLength(1)
    expect(getPerson(data, data.rootId)).toBeTruthy()
  })

  it('reconnects an orphaned child to an existing parent', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId
    data = addParent(data, rootId, 'Parent')
    const parentId = Object.values(data.people).find((person) => person.name === 'Parent')!.id
    data = addParent(data, parentId, 'Grandparent')
    const grandparentId = Object.values(data.people).find((person) => person.name === 'Grandparent')!.id

    data = removePerson(data, parentId)
    expect(getPerson(data, rootId)?.parentIds).toEqual([])

    expect(listLinkableParents(data, rootId).map((person) => person.id)).toContain(grandparentId)
    data = linkParent(data, rootId, grandparentId)
    expect(getPerson(data, rootId)?.parentIds).toEqual([grandparentId])

    const layout = layoutFamilyTree(data)
    expect(layout.edges.some((edge) => edge.kind === 'parent-child')).toBe(true)
  })

  it('does not link descendants or self as parents', () => {
    let data = createEmptyTree('Root')
    const rootId = data.rootId
    data = addChild(data, rootId, 'Child')
    const childId = Object.values(data.people).find((person) => person.name === 'Child')!.id
    data = addChild(data, childId, 'Grandchild')
    const grandchildId = Object.values(data.people).find((person) => person.name === 'Grandchild')!.id

    data = {
      ...data,
      people: {
        ...data.people,
        [childId]: { ...data.people[childId], parentIds: [] }
      }
    }

    const linkableIds = listLinkableParents(data, childId).map((person) => person.id)
    expect(linkableIds).toContain(rootId)
    expect(linkableIds).not.toContain(childId)
    expect(linkableIds).not.toContain(grandchildId)
    expect(linkParent(data, childId, grandchildId)).toEqual(data)
  })
})

describe('layoutFamilyTree', () => {
  it('places generations in separate rows with parent-child edges', () => {
    let data = createEmptyTree('Root')
    data = addChild(data, data.rootId, 'Child')

    const layout = layoutFamilyTree(data)
    const root = layout.nodes.find((node) => node.person.id === data.rootId)!
    const child = layout.nodes.find((node) => node.person.name === 'Child')!

    expect(child.y).toBeGreaterThan(root.y)
    expect(layout.edges.some((edge) => edge.kind === 'parent-child')).toBe(true)
  })

  it('draws a spouse connector', () => {
    let data = createEmptyTree('Root')
    data = addSpouse(data, data.rootId, 'Partner')

    const layout = layoutFamilyTree(data)
    expect(layout.edges.some((edge) => edge.kind === 'spouse')).toBe(true)
  })

  it('keeps a child and later-added spouse side by side under the parents', () => {
    let data = createEmptyTree('Root')
    data = addSpouse(data, data.rootId, 'Partner')
    data = addChild(data, data.rootId, 'Child')
    data = addSpouse(data, Object.values(data.people).find((p) => p.name === 'Child')!.id, 'Child spouse')

    const layout = layoutFamilyTree(data)
    const child = layout.nodes.find((node) => node.person.name === 'Child')!
    const spouse = layout.nodes.find((node) => node.person.name === 'Child spouse')!

    expect(spouse.x).toBeGreaterThan(child.x)
    expect(spouse.x - child.x).toBeGreaterThanOrEqual(148)
    expect(child.y).toBe(spouse.y)
  })

  it('sorts siblings left to right by birth year then first name', () => {
    let data = createEmptyTree('Parents')
    data = addSpouse(data, data.rootId, 'Partner')
    data = addChild(data, data.rootId, 'Younger')
    data = addChild(data, data.rootId, 'Older')

    const younger = Object.values(data.people).find((person) => person.name === 'Younger')!
    const older = Object.values(data.people).find((person) => person.name === 'Older')!
    data = {
      ...data,
      people: {
        ...data.people,
        [younger.id]: { ...younger, birthYear: '1950' },
        [older.id]: { ...older, birthYear: '1940' }
      }
    }

    const layout = layoutFamilyTree(data)
    const youngerNode = layout.nodes.find((node) => node.person.name === 'Younger')!
    const olderNode = layout.nodes.find((node) => node.person.name === 'Older')!

    expect(olderNode.x).toBeLessThan(youngerNode.x)
  })

  it('connects children from the center of the parent couple', () => {
    let data = createEmptyTree('Father')
    data = addSpouse(data, data.rootId, 'Mother')
    data = addChild(data, data.rootId, 'Child')

    const child = Object.values(data.people).find((person) => person.name === 'Child')!
    data = {
      ...data,
      people: {
        ...data.people,
        [child.id]: { ...child, parentIds: [data.rootId] }
      }
    }

    const layout = layoutFamilyTree(data)
    const father = layout.nodes.find((node) => node.person.name === 'Father')!
    const mother = layout.nodes.find((node) => node.person.name === 'Mother')!
    const parentCenterX = father.x + 148 / 2 + (mother.x + 148 / 2 - (father.x + 148 / 2)) / 2
    const parentBottom = Math.max(father.y + father.height, mother.y + mother.height)

    const trunk = layout.edges.find(
      (edge) =>
        edge.kind === 'parent-child' &&
        Math.abs(edge.from.y - parentBottom) < 1 &&
        Math.abs(edge.from.x - parentCenterX) < 1
    )

    expect(trunk).toBeTruthy()
  })

  it('starts parent-child connectors below tall nodes', () => {
    let data = createEmptyTree('Parent')
    data = addChild(data, data.rootId, 'Child')
    data = {
      ...data,
      people: {
        ...data.people,
        [data.rootId]: {
          ...data.people[data.rootId],
          name: 'Anna Lucille Snodgrass Steighner',
          birthYear: '1907',
          deathYear: '1996'
        }
      }
    }

    const layout = layoutFamilyTree(data)
    const parent = layout.nodes.find((node) => node.person.id === data.rootId)!
    const trunk = layout.edges.find((edge) => edge.kind === 'parent-child')!

    expect(parent.height).toBeGreaterThan(NODE_HEIGHT)
    expect(trunk.from.y).toBe(parent.y + parent.height)
  })

  it('does not overlap siblings when parentIds order differs between children', () => {
    let data = createEmptyTree('Katherine')
    data = addSpouse(data, data.rootId, 'Aaron')
    const katherineId = data.rootId
    const aaronId = getPerson(data, katherineId)!.spouseId!

    data = addChild(data, katherineId, 'Mikayla')
    data = addChild(data, katherineId, 'Oliver')
    data = addChild(data, katherineId, 'Atticus')

    const mikayla = Object.values(data.people).find((person) => person.name === 'Mikayla')!
    const oliver = Object.values(data.people).find((person) => person.name === 'Oliver')!
    const atticus = Object.values(data.people).find((person) => person.name === 'Atticus')!

    data = {
      ...data,
      people: {
        ...data.people,
        [mikayla.id]: { ...mikayla, birthYear: '2000', parentIds: [katherineId, aaronId] },
        [oliver.id]: { ...oliver, birthYear: '2012', parentIds: [aaronId, katherineId] },
        [atticus.id]: { ...atticus, birthYear: '2018', parentIds: [katherineId, aaronId] }
      }
    }

    const layout = layoutFamilyTree(data)
    const childNodes = layout.nodes.filter((node) =>
      ['Mikayla', 'Oliver', 'Atticus'].includes(node.person.name)
    )

    expect(childNodes).toHaveLength(3)

    const sorted = [...childNodes].sort((a, b) => a.x - b.x)
    expect(sorted.map((node) => node.person.name)).toEqual(['Mikayla', 'Oliver', 'Atticus'])

    for (let index = 1; index < sorted.length; index++) {
      expect(sorted[index].x).toBeGreaterThanOrEqual(sorted[index - 1].x + 148 + 36)
    }
  })

  it('renders ancestors above the root', () => {
    let data = createEmptyTree('Root')
    data = addParent(data, data.rootId, 'Parent')
    data = addParent(data, data.rootId, 'Other parent')

    const layout = layoutFamilyTree(data)
    const root = layout.nodes.find((node) => node.person.id === data.rootId)!
    const parent = layout.nodes.find((node) => node.person.name === 'Parent')!
    const otherParent = layout.nodes.find((node) => node.person.name === 'Other parent')!

    expect(parent.y).toBeLessThan(root.y)
    expect(otherParent.y).toBe(parent.y)
    expect(layout.edges.some((edge) => edge.kind === 'parent-child')).toBe(true)
  })

  it('separates cousin clusters that would otherwise collide', () => {
    let data = createEmptyTree('Grandparent')
    data = addChild(data, data.rootId, 'Rebecca')
    data = addChild(data, data.rootId, 'Katherine')
    const rebeccaId = Object.values(data.people).find((person) => person.name === 'Rebecca')!.id
    const katherineId = Object.values(data.people).find((person) => person.name === 'Katherine')!.id

    data = addSpouse(data, rebeccaId, 'Brian')
    data = addSpouse(data, katherineId, 'Aaron')

    for (const parentId of [rebeccaId, katherineId]) {
      data = addChild(data, parentId, 'Child A')
      data = addChild(data, parentId, 'Child B')
      data = addChild(data, parentId, 'Child C')
    }

    const layout = layoutFamilyTree(data)
    const generation = Math.max(...layout.nodes.map((node) => node.generation))
    const row = layout.nodes
      .filter((node) => node.generation === generation)
      .sort((a, b) => a.x - b.x)

    for (let index = 1; index < row.length; index++) {
      expect(row[index].x).toBeGreaterThanOrEqual(row[index - 1].x + 148 + 36)
    }
  })
})
