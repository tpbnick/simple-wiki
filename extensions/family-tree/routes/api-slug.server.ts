import { json, error } from '@sveltejs/kit'
import { readJsonBody } from '$lib/http.js'
import type { RequestHandler } from '@sveltejs/kit'
import type { FamilyTreeData } from '../lib/types.js'
import { validateFamilyTreeData } from '../lib/validate.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import { deleteFamilyTree, FamilyTreeConflictError, getFamilyTree, saveFamilyTree } from '../db.js'

const MAX_FAMILY_TREE_BODY_BYTES = 2 * 1024 * 1024

export const GET: RequestHandler = ({ params, locals, getClientAddress }) => {
  requireReadAccess(locals)
  enforceReadRateLimit(getClientAddress, 'family-tree-read')
  const tree = getFamilyTree(params.slug!)
  if (!tree) error(404, 'Family tree not found')
  return json(tree)
}

export const PUT: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'family-tree-save')

  const existing = getFamilyTree(params.slug!)
  if (!existing) error(404, 'Family tree not found')

  const body = (await readJsonBody(request, MAX_FAMILY_TREE_BODY_BYTES)) as Record<string, unknown>
  const title = String(body?.title ?? existing.title).trim()
  const data = body?.data as FamilyTreeData | undefined
  const expectedUpdatedAt =
    typeof body?.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : null

  if (!title) error(400, 'Title is required')
  if (!data) error(400, 'Invalid family tree data')
  if (typeof body?.expectedUpdatedAt !== 'string') {
    error(400, 'expectedUpdatedAt is required when updating a family tree')
  }

  const validation = validateFamilyTreeData(data)
  if (!validation.ok) {
    error(400, validation.message ?? 'Invalid family tree data')
  }

  try {
    const saved = saveFamilyTree(params.slug!, title, data, expectedUpdatedAt)
    return json(saved)
  } catch (e) {
    if (e instanceof FamilyTreeConflictError) {
      const current = getFamilyTree(params.slug!)
      return json(
        {
          error: e.message,
          expectedUpdatedAt: current?.updated_at ?? null
        },
        { status: 409 }
      )
    }
    throw e
  }
}

export const DELETE: RequestHandler = ({ params, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'family-tree-delete')

  const existing = getFamilyTree(params.slug!)
  if (!existing) error(404, 'Family tree not found')

  deleteFamilyTree(params.slug!)
  return json({ ok: true })
}
