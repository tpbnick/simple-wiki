import schemaSql from './schema.sql?raw'
import { getDatabase } from '$lib/db/connection.js'
import { createEmptyTree } from './lib/model.js'
import type { FamilyTreeData } from './lib/types.js'

export const FAMILY_TREE_SCHEMA = schemaSql

export interface FamilyTreeRecord {
  id: number
  slug: string
  title: string
  data: FamilyTreeData
  created_at: string
  updated_at: string
}

interface FamilyTreeRow {
  id: number
  slug: string
  title: string
  data: string
  created_at: string
  updated_at: string
}

/** Thrown when a family tree save conflicts with a newer server revision. */
export class FamilyTreeConflictError extends Error {
  constructor(message = 'Family tree was modified since you started editing') {
    super(message)
    this.name = 'FamilyTreeConflictError'
  }
}

type FamilyTreeStatements = ReturnType<typeof buildFamilyTreeStatements>

let statements: FamilyTreeStatements | null = null

function buildFamilyTreeStatements(db: ReturnType<typeof getDatabase>) {
  return {
    listFamilyTrees: db.prepare<[], FamilyTreeRow>(
      'SELECT * FROM family_trees ORDER BY updated_at DESC'
    ),
    getFamilyTree: db.prepare<[string], FamilyTreeRow>(
      'SELECT * FROM family_trees WHERE slug = ? LIMIT 1'
    ),
    insertFamilyTree: db.prepare(
      'INSERT INTO family_trees (slug, title, data) VALUES (@slug, @title, @data)'
    ),
    updateFamilyTree: db.prepare(
      'UPDATE family_trees SET title = @title, data = @data WHERE slug = @slug'
    ),
    updateFamilyTreeIfUnchanged: db.prepare(
      'UPDATE family_trees SET title = @title, data = @data WHERE slug = @slug AND updated_at = @expectedUpdatedAt'
    ),
    deleteFamilyTree: db.prepare('DELETE FROM family_trees WHERE slug = ?')
  }
}

function getStatements() {
  if (!statements) {
    statements = buildFamilyTreeStatements(getDatabase())
  }
  return statements
}

/** Clears cached statements (for tests). */
export function resetFamilyTreeDbCache(): void {
  statements = null
}

function parseFamilyTreeRow(row: FamilyTreeRow): FamilyTreeRecord | null {
  try {
    return {
      ...row,
      data: JSON.parse(row.data) as FamilyTreeData
    }
  } catch {
    console.error(`[family-tree] invalid JSON for slug=${row.slug}`)
    return null
  }
}

/** Returns all family trees ordered by most recently updated. */
export function listFamilyTrees(): FamilyTreeRecord[] {
  return getStatements()
    .listFamilyTrees.all()
    .map(parseFamilyTreeRow)
    .filter((tree): tree is FamilyTreeRecord => tree !== null)
}

/** Returns a family tree by slug, or null when it does not exist. */
export function getFamilyTree(slug: string): FamilyTreeRecord | null {
  const row = getStatements().getFamilyTree.get(slug)
  return row ? parseFamilyTreeRow(row) : null
}

/** Creates a new family tree with a single root person. */
export function createFamilyTree(title: string, slug: string): FamilyTreeRecord {
  const data = createEmptyTree(title)

  try {
    getStatements().insertFamilyTree.run({
      slug,
      title,
      data: JSON.stringify(data)
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new FamilyTreeConflictError('A family tree with this name already exists')
    }
    throw error
  }

  const tree = getFamilyTree(slug)
  if (!tree) throw new Error(`Failed to create family tree ${slug}`)
  return tree
}

/** Saves family tree JSON and title. */
export function saveFamilyTree(
  slug: string,
  title: string,
  data: FamilyTreeData,
  expectedUpdatedAt?: string | null
): FamilyTreeRecord {
  const stmts = getStatements()
  const payload = {
    slug,
    title,
    data: JSON.stringify(data)
  }

  if (expectedUpdatedAt) {
    const result = stmts.updateFamilyTreeIfUnchanged.run({
      ...payload,
      expectedUpdatedAt
    })
    if (result.changes === 0) {
      throw new FamilyTreeConflictError()
    }
  } else {
    stmts.updateFamilyTree.run(payload)
  }

  const tree = getFamilyTree(slug)
  if (!tree) throw new Error(`Failed to save family tree ${slug}`)
  return tree
}

/** Deletes a family tree by slug. */
export function deleteFamilyTree(slug: string): void {
  getStatements().deleteFamilyTree.run(slug)
}
