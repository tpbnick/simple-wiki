import { error, json } from '@sveltejs/kit'
import { getRevisionDiff } from '$lib/db/index.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ params, locals, getClientAddress }) => {
  requireReadAccess(locals)
  enforceReadRateLimit(getClientAddress, 'revision-diff')

  const revisionId = Number(params.id)
  if (!Number.isInteger(revisionId) || revisionId < 1) {
    error(400, 'Invalid revision ID')
  }

  const result = getRevisionDiff(revisionId)
  if (!result) error(404, 'Revision not found')

  return json(result)
}
