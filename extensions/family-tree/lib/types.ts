/** A person node in a family tree. */
export interface FamilyTreePerson {
  id: string
  name: string
  birthYear?: string
  deathYear?: string
  imageUrl?: string
  /** Parent person ids (one or two). */
  parentIds: string[]
  /** Linked spouse, if any. */
  spouseId?: string
}

/** Serialized tree stored in SQLite. */
export interface FamilyTreeData {
  rootId: string
  people: Record<string, FamilyTreePerson>
}

export interface FamilyTreeRecord {
  id: number
  slug: string
  title: string
  data: FamilyTreeData
  created_at: string
  updated_at: string
}

export interface PositionedPerson {
  person: FamilyTreePerson
  x: number
  y: number
  /** Estimated rendered card height (multi-line names grow taller than NODE_HEIGHT). */
  height: number
  generation: number
}

export interface TreeEdge {
  kind: 'spouse' | 'parent-child'
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Person receiving the parent-child connection (for lineage highlighting). */
  childId?: string
}

export interface TreeLayout {
  nodes: PositionedPerson[]
  edges: TreeEdge[]
  width: number
  height: number
}

export const NODE_WIDTH = 148
export const NODE_HEIGHT = 108
export const H_GAP = 36
export const V_GAP = 72
