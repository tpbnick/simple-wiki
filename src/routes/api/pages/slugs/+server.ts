import { json, error } from '@sveltejs/kit'
import { getAllPageSlugs } from '$lib/db/pages.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import type { RequestHandler } from './$types'

/** Returns all page slugs for wiki-link resolution in clients. */
export const GET: RequestHandler = ({ locals, getClientAddress }) => {
  requireReadAccess(locals)
  enforceReadRateLimit(getClientAddress, 'page-slugs')
  return json({ slugs: [...getAllPageSlugs()] })
}
