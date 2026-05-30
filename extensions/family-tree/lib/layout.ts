import type {
  FamilyTreeData,
  FamilyTreePerson,
  PositionedPerson,
  TreeEdge,
  TreeLayout
} from './types.js'
import { comparePeopleByBirthThenName } from './name.js'
import { estimateNodeHeight } from './node-height.js'
import { H_GAP, NODE_HEIGHT, NODE_WIDTH, V_GAP } from './types.js'

function propagateAncestorGenerations(
  data: FamilyTreeData,
  generations: Map<string, number>
): void {
  let changed = true

  while (changed) {
    changed = false

    for (const person of Object.values(data.people)) {
      const generation = generations.get(person.id)
      if (generation == null) continue

      for (const parentId of person.parentIds) {
        const parentGeneration = generation - 1
        const current = generations.get(parentId)
        if (current === undefined || current > parentGeneration) {
          generations.set(parentId, parentGeneration)
          changed = true
        }

        const parent = data.people[parentId]
        if (parent?.spouseId && data.people[parent.spouseId]) {
          const spouseGeneration = generations.get(parent.spouseId)
          if (spouseGeneration === undefined || spouseGeneration > parentGeneration) {
            generations.set(parent.spouseId, parentGeneration)
            changed = true
          }
        }
      }
    }
  }
}

function assignGenerations(data: FamilyTreeData): Map<string, number> {
  const generations = new Map<string, number>()
  const root = data.people[data.rootId]
  if (!root) return generations

  const queue: Array<{ id: string; generation: number }> = [{ id: root.id, generation: 0 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, generation } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const person = data.people[id]
    if (!person) continue

    generations.set(id, Math.max(generations.get(id) ?? 0, generation))

    if (person.spouseId && data.people[person.spouseId]) {
      const spouseGen = generations.get(person.spouseId) ?? generation
      const shared = Math.max(generation, spouseGen)
      generations.set(id, shared)
      generations.set(person.spouseId, shared)
    }

    for (const childId of childrenOf(data, id)) {
      queue.push({ id: childId, generation: generation + 1 })
    }

    if (person.spouseId) {
      for (const childId of childrenOf(data, person.spouseId)) {
        queue.push({ id: childId, generation: generation + 1 })
      }
    }
  }

  propagateAncestorGenerations(data, generations)

  return generations
}

function childrenOf(data: FamilyTreeData, parentId: string): string[] {
  return Object.values(data.people)
    .filter((person) => person.parentIds.includes(parentId))
    .sort((a, b) => comparePeopleByBirthThenName(a, b))
    .map((person) => person.id)
}

function unitKey(person: FamilyTreePerson): string {
  if (!person.spouseId) return person.id
  return [person.id, person.spouseId].sort().join(':')
}

/** Canonical parent couple key so siblings stay in one row regardless of parentIds order. */
function parentUnitKeyForChild(child: FamilyTreePerson, data: FamilyTreeData): string | null {
  const parents = child.parentIds
    .map((id) => data.people[id])
    .filter((parent): parent is FamilyTreePerson => parent != null)

  if (parents.length === 0) return null

  for (const parent of parents) {
    if (parent.spouseId && child.parentIds.includes(parent.spouseId)) {
      return unitKey(parent)
    }
  }

  return unitKey(parents[0])
}

function clusterBounds(ids: string[], positions: Map<string, { x: number; y: number; generation: number }>) {
  const xs = ids.map((id) => positions.get(id)!.x)
  return {
    left: Math.min(...xs),
    right: Math.max(...xs) + NODE_WIDTH
  }
}

/** Pushes sibling/cousin clusters apart when centered child rows collide. */
function resolveGenerationClusterOverlaps(
  positions: Map<string, { x: number; y: number; generation: number }>,
  childUnits: Map<string, string[]>
): void {
  const clustersByGeneration = new Map<number, Array<{ ids: string[]; left: number; right: number }>>()

  for (const ids of childUnits.values()) {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) continue

    const generation = positions.get(uniqueIds[0])?.generation
    if (generation == null) continue

    const bounds = clusterBounds(uniqueIds, positions)
    const list = clustersByGeneration.get(generation) ?? []
    list.push({ ids: uniqueIds, ...bounds })
    clustersByGeneration.set(generation, list)
  }

  for (const clusters of clustersByGeneration.values()) {
    clusters.sort((a, b) => a.left - b.left)

    for (let index = 1; index < clusters.length; index++) {
      const previous = clusters[index - 1]
      const current = clusters[index]
      const minLeft = previous.right + H_GAP
      if (current.left >= minLeft) continue

      const shift = minLeft - current.left
      for (let clusterIndex = index; clusterIndex < clusters.length; clusterIndex++) {
        const cluster = clusters[clusterIndex]
        cluster.left += shift
        cluster.right += shift
        for (const id of cluster.ids) {
          const position = positions.get(id)
          if (position) position.x += shift
        }
      }
    }
  }
}

function buildGenerationUnits(
  data: FamilyTreeData,
  generations: Map<string, number>
): Map<number, string[][]> {
  const byGeneration = new Map<number, FamilyTreePerson[]>()

  for (const person of Object.values(data.people)) {
    const generation = generations.get(person.id)
    if (generation == null) continue
    const list = byGeneration.get(generation) ?? []
    list.push(person)
    byGeneration.set(generation, list)
  }

  const unitsByGeneration = new Map<number, string[][]>()

  for (const [generation, people] of byGeneration.entries()) {
    const seen = new Set<string>()
    const units: string[][] = []

    for (const person of people) {
      if (seen.has(person.id)) continue

      if (person.spouseId && data.people[person.spouseId]) {
        const spouse = data.people[person.spouseId]
        units.push([person.id, spouse.id])
        seen.add(person.id)
        seen.add(spouse.id)
      } else {
        units.push([person.id])
        seen.add(person.id)
      }
    }

    unitsByGeneration.set(generation, units)
  }

  return unitsByGeneration
}

function unitWidth(memberCount: number): number {
  return memberCount * NODE_WIDTH + Math.max(0, memberCount - 1) * H_GAP
}

function centerX(x: number): number {
  return x + NODE_WIDTH / 2
}

function nodeBottom(node: PositionedPerson): number {
  return node.y + node.height
}

function nodeTop(node: PositionedPerson): number {
  return node.y
}

function buildGenerationY(
  generations: Map<string, number>,
  heights: Map<string, number>
): Map<number, number> {
  const rowHeightByGen = new Map<number, number>()

  for (const [personId, generation] of generations) {
    const height = heights.get(personId) ?? NODE_HEIGHT
    rowHeightByGen.set(generation, Math.max(rowHeightByGen.get(generation) ?? 0, height))
  }

  const sorted = [...rowHeightByGen.keys()].sort((a, b) => a - b)
  const yByGen = new Map<number, number>()
  let y = 0

  for (const generation of sorted) {
    yByGen.set(generation, y)
    y += rowHeightByGen.get(generation)! + V_GAP
  }

  return yByGen
}

function parentCoupleNodes(
  child: FamilyTreePerson,
  data: FamilyTreeData,
  nodeById: Map<string, PositionedPerson>
): PositionedPerson[] {
  const anchorId = child.parentIds[0]
  if (!anchorId) return []

  const anchorPerson = data.people[anchorId]
  const anchorNode = nodeById.get(anchorId)
  if (!anchorPerson || !anchorNode) return []

  if (anchorPerson.spouseId && data.people[anchorPerson.spouseId]) {
    const spouseNode = nodeById.get(anchorPerson.spouseId)
    return spouseNode ? [anchorNode, spouseNode] : [anchorNode]
  }

  return child.parentIds
    .map((parentId) => nodeById.get(parentId))
    .filter((node): node is PositionedPerson => node != null)
}

function addParentChildEdges(
  childNode: PositionedPerson,
  parentNodes: PositionedPerson[],
  edges: TreeEdge[]
): void {
  if (parentNodes.length === 0) return

  const parentCenterX =
    parentNodes.reduce((sum, parent) => sum + centerX(parent.x), 0) / parentNodes.length
  const parentBottom = Math.max(...parentNodes.map((parent) => nodeBottom(parent)))
  const childTop = nodeTop(childNode)
  const childCenterX = centerX(childNode.x)

  if (Math.abs(parentCenterX - childCenterX) < 1) {
    edges.push({
      kind: 'parent-child',
      childId: childNode.person.id,
      from: { x: parentCenterX, y: parentBottom },
      to: { x: childCenterX, y: childTop }
    })
    return
  }

  const midY = parentBottom + (childTop - parentBottom) / 2
  edges.push({
    kind: 'parent-child',
    childId: childNode.person.id,
    from: { x: parentCenterX, y: parentBottom },
    to: { x: parentCenterX, y: midY }
  })
  edges.push({
    kind: 'parent-child',
    childId: childNode.person.id,
    from: { x: parentCenterX, y: midY },
    to: { x: childCenterX, y: midY }
  })
  edges.push({
    kind: 'parent-child',
    childId: childNode.person.id,
    from: { x: childCenterX, y: midY },
    to: { x: childCenterX, y: childTop }
  })
}

/** Computes top-down positions and straight connector segments for a vertical tree. */
export function layoutFamilyTree(data: FamilyTreeData): TreeLayout {
  const generations = assignGenerations(data)
  const unitsByGeneration = buildGenerationUnits(data, generations)
  const personHeights = new Map(
    Object.values(data.people).map((person) => [person.id, estimateNodeHeight(person)])
  )
  const generationY = buildGenerationY(generations, personHeights)
  const positions = new Map<string, { x: number; y: number; generation: number }>()
  const unitPositions = new Map<string, { x: number; y: number; width: number; generation: number }>()

  const generationLevels = [...unitsByGeneration.keys()].sort((a, b) => a - b)
  let maxWidth = 0

  for (const generation of generationLevels) {
    const units = unitsByGeneration.get(generation) ?? []
    const unitWidths = units.map((members) => unitWidth(members.length))
    const rowWidth =
      unitWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, units.length - 1) * H_GAP * 2
    maxWidth = Math.max(maxWidth, rowWidth)

    let cursor = -rowWidth / 2
    const y = generationY.get(generation) ?? 0

    for (let index = 0; index < units.length; index++) {
      const members = units[index]
      const width = unitWidths[index]
      const unitX = cursor

      unitPositions.set(unitKey(data.people[members[0]]), {
        x: unitX,
        y,
        width,
        generation
      })

      members.forEach((memberId, memberIndex) => {
        positions.set(memberId, {
          x: unitX + memberIndex * (NODE_WIDTH + H_GAP),
          y,
          generation
        })
      })

      cursor += width + H_GAP * 2
    }
  }

  const childUnits = new Map<string, string[]>()
  for (const person of Object.values(data.people)) {
    if (person.parentIds.length === 0) continue
    const key = parentUnitKeyForChild(person, data)
    if (!key) continue
    const list = childUnits.get(key) ?? []
    if (!list.includes(person.id)) list.push(person.id)
    childUnits.set(key, list)
  }

  for (const [unit, childIds] of childUnits.entries()) {
    const unitPos = unitPositions.get(unit)
    if (!unitPos || childIds.length === 0) continue

    const childUnitsList: string[][] = []
    const seen = new Set<string>()
    const sortedChildIds = [...childIds].sort((a, b) => {
      const personA = data.people[a]
      const personB = data.people[b]
      if (!personA || !personB) return 0
      return comparePeopleByBirthThenName(personA, personB)
    })

    for (const childId of sortedChildIds) {
      const child = data.people[childId]
      if (!child || seen.has(childId)) continue
      if (child.spouseId && data.people[child.spouseId]) {
        childUnitsList.push([child.id, child.spouseId])
        seen.add(child.id)
        seen.add(child.spouseId)
      } else {
        childUnitsList.push([child.id])
        seen.add(child.id)
      }
    }

    const totalChildWidth =
      childUnitsList.reduce((sum, members) => sum + unitWidth(members.length), 0) +
      Math.max(0, childUnitsList.length - 1) * H_GAP * 2
    let cursor = unitPos.x + unitPos.width / 2 - totalChildWidth / 2
    const childGeneration = generations.get(childIds[0]) ?? unitPos.generation + 1
    const y = generationY.get(childGeneration) ?? 0

    for (const members of childUnitsList) {
      const width = unitWidth(members.length)
      members.forEach((memberId, memberIndex) => {
        positions.set(memberId, {
          x: cursor + memberIndex * (NODE_WIDTH + H_GAP),
          y,
          generation: childGeneration
        })
      })
      cursor += width + H_GAP * 2
    }
  }

  resolveGenerationClusterOverlaps(positions, childUnits)

  const nodes: PositionedPerson[] = Object.values(data.people)
    .map((person) => {
      const position = positions.get(person.id)
      if (!position) return null
      return {
        person,
        x: position.x,
        y: position.y,
        height: personHeights.get(person.id) ?? NODE_HEIGHT,
        generation: position.generation
      }
    })
    .filter((node): node is PositionedPerson => node != null)

  const edges: TreeEdge[] = []
  const seenSpouses = new Set<string>()
  const nodeById = new Map(nodes.map((node) => [node.person.id, node]))
  const siblingGroups = new Map<string, PositionedPerson[]>()

  for (const node of nodes) {
    if (node.person.parentIds.length === 0) continue
    const key = parentUnitKeyForChild(node.person, data)
    if (!key) continue
    const group = siblingGroups.get(key) ?? []
    group.push(node)
    siblingGroups.set(key, group)
  }

  for (const group of siblingGroups.values()) {
    group.sort((a, b) => comparePeopleByBirthThenName(a.person, b.person))
    const parentNodes = parentCoupleNodes(group[0].person, data, nodeById)
    for (const childNode of group) {
      addParentChildEdges(childNode, parentNodes, edges)
    }
  }

  for (const node of nodes) {
    const person = node.person
    if (person.spouseId && !seenSpouses.has(person.id) && !seenSpouses.has(person.spouseId)) {
      const spouseNode = nodes.find((entry) => entry.person.id === person.spouseId)
      if (spouseNode) {
        seenSpouses.add(person.id)
        seenSpouses.add(person.spouseId)
        edges.push({
          kind: 'spouse',
          from: { x: centerX(node.x), y: node.y + node.height / 2 },
          to: { x: centerX(spouseNode.x), y: spouseNode.y + spouseNode.height / 2 }
        })
      }
    }
  }

  const xs = nodes.map((node) => node.x)
  const minX = xs.length ? Math.min(...xs) : 0
  const maxX = xs.length ? Math.max(...xs) + NODE_WIDTH : NODE_WIDTH
  const maxY = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : NODE_HEIGHT

  return {
    nodes,
    edges,
    width: Math.max(maxWidth, maxX - minX),
    height: maxY + V_GAP
  }
}
