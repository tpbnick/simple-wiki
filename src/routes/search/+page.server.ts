import { searchPages } from '$lib/db/index.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url, locals, getClientAddress }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })
  enforceReadRateLimit(getClientAddress, 'search')

  const q = url.searchParams.get('q') ?? ''
  const results = q.trim() ? searchPages(q, 30) : []
  return { q, results, canEdit: !!locals.user }
}
