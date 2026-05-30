import { json, error } from '@sveltejs/kit'
import {
  MIN_SEARCH_SUGGESTION_LENGTH,
  searchPageSuggestions,
  searchPages,
  SearchError
} from '$lib/db/index.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ url, locals, getClientAddress }) => {
  requireReadAccess(locals)
  enforceReadRateLimit(getClientAddress, 'search')

  const q = url.searchParams.get('q') ?? ''
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100)
  const suggestions = url.searchParams.get('suggestions') === '1'

  if (!q.trim()) return json([])

  try {
    if (suggestions) {
      if (q.trim().length < MIN_SEARCH_SUGGESTION_LENGTH) return json([])
      return json(searchPageSuggestions(q, Math.min(limit, 10)))
    }

    return json(searchPages(q, limit))
  } catch (searchError) {
    if (searchError instanceof SearchError) {
      error(503, 'Search is temporarily unavailable')
    }
    throw searchError
  }
}
