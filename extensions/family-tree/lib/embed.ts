import { getFamilyTree } from '../db.js'
import { escapeHtml } from '$lib/html.js'
import { getRenderContext } from '$lib/markdown/render-context.js'
import { renderFamilyTreeErrorHtml } from './embed-error.js'
import { encodeFamilyTreePayload } from './embed-payload.server.js'
import { validateFamilyTreeData } from './validate.js'

import { resolveFamilyTreeParam } from './embed-params.js'

export { resolveFamilyTreeParam }

export function renderFamilyTreeEmbed(params: Record<string, string>): string {
  const slug = resolveFamilyTreeParam(params)
  if (!slug) {
    return renderFamilyTreeErrorHtml(
      'Missing family parameter',
      'Use {{FamilyTree|family=your-tree-slug}} and replace your-tree-slug with an existing tree name.'
    )
  }

  const tree = getFamilyTree(slug)
  if (!tree) {
    return renderFamilyTreeErrorHtml(
      'Family tree not found',
      `No tree matches family="${slug}". Create one from Admin → Extensions or check the slug spelling.`
    )
  }

  const validation = validateFamilyTreeData(tree.data)
  if (!validation.ok) {
    return renderFamilyTreeErrorHtml('Family tree data is corrupt', validation.message)
  }

  const treePayload = escapeHtml(encodeFamilyTreePayload(tree.data))
  const canEdit = getRenderContext().canEdit ?? false
  const editorLink = canEdit
    ? `<a class="btn btn-sm btn-ghost" href="/family-tree/${escapeHtml(slug)}">Edit tree</a>`
    : ''

  return `<div class="wiki-family-tree-embed wiki-card not-prose" data-family="${escapeHtml(slug)}" data-tree="${treePayload}">
    <div class="wiki-family-tree-embed__header">
      <p class="wiki-family-tree-embed__title">${escapeHtml(tree.title)}</p>
      ${editorLink}
    </div>
    <div class="wiki-family-tree-embed__mount"></div>
  </div>`
}
