import { json, error } from '@sveltejs/kit'
import { readJsonBody } from '$lib/http.js'
import { slugify } from '$lib/slug.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import type { RequestHandler } from '@sveltejs/kit'
import { createFamilyTree, FamilyTreeConflictError } from '../db.js'

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'family-tree-create')

  const body = (await readJsonBody(request, 2 * 1024 * 1024)) as Record<string, unknown>
  const title = String(body?.title ?? '').trim()
  if (!title) error(400, 'Title is required')

  const slug = slugify(title)
  if (!slug) error(400, 'Could not generate a slug from the title')

  try {
    const created = createFamilyTree(title, slug)
    return json({ slug: created.slug, title: created.title, data: created.data })
  } catch (e) {
    if (e instanceof FamilyTreeConflictError) {
      error(409, e.message)
    }
    throw e
  }
}
