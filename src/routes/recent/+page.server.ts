import { fail } from '@sveltejs/kit'
import { getRecentRevisions, getRevisionRetentionLimit } from '$lib/db/index.js'
import { handleRevisionRetentionAction } from '$lib/server/revision-retention-action.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })

  const changes = getRecentRevisions(100)
  const revisionRetention = getRevisionRetentionLimit()

  return {
    changes,
    revisionRetention,
    isAdmin: locals.user?.isAdmin === true
  }
}

export const actions: Actions = {
  updateRevisionRetention: async ({ request, locals, getClientAddress }) => {
    requireReadAccess(locals, { redirect: true, next: '/recent' })

    if (!locals.user?.isAdmin) {
      return fail(403, { retentionError: 'Admin access required' })
    }

    return handleRevisionRetentionAction(await request.formData(), locals, getClientAddress)
  }
}
