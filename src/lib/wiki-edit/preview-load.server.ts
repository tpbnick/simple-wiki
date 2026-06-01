import { getAllPageSlugs, getAllPages } from '$lib/db/index.js'
import { listFamilyTrees } from '$extensions/family-tree/db.js'
import type { EditorPreviewBundle } from './client-preview.js'

/** Loads slug, template, and family-tree data for client-side editor preview. */
export function loadEditorPreviewBundle(): EditorPreviewBundle {
  const templatePages = Object.fromEntries(
    getAllPages()
      .filter((page) => page.namespace === 'template')
      .map((page) => [page.slug, page.content])
  )

  let familyTrees: EditorPreviewBundle['familyTrees'] = {}
  try {
    familyTrees = Object.fromEntries(
      listFamilyTrees().map((tree) => [tree.slug, { title: tree.title, data: tree.data }])
    )
  } catch {
    familyTrees = {}
  }

  return {
    existingSlugs: [...getAllPageSlugs()],
    templatePages,
    familyTrees
  }
}
