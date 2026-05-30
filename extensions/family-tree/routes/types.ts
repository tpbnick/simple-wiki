import type { FamilyTreeRecord } from '../db.js'

export type EditPageData = {
  tree: FamilyTreeRecord
  canEdit: boolean
  existingPageSlugs: string[]
}

export type ListPageData = {
  trees: FamilyTreeRecord[]
  canEdit: boolean
}
