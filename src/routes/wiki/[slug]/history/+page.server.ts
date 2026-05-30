import { getPage, getRevisions, restoreRevision, PageConflictError } from '$lib/db/index.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'
import { error, fail, redirect, isRedirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })

  const page = getPage(params.slug)
  if (!page) error(404, 'Page not found')
  const revisions = getRevisions(params.slug)
  return { page, revisions, canEdit: !!locals.user }
}

export const actions: Actions = {
  restore: async ({ request, params, locals, getClientAddress }) => {
    if (!locals.user) return fail(401, { error: 'Sign in to restore revisions' })

    const rateLimited = enforceFormWriteRateLimit(locals, getClientAddress, 'revision-restore')
    if (rateLimited) return rateLimited

    const data = await request.formData()
    const revisionId = Number(data.get('revisionId'))
    const summary = String(data.get('summary') ?? 'Restored revision').trim()
    const expectedUpdatedAt = String(data.get('expectedUpdatedAt') ?? '') || null

    if (!revisionId) return fail(400, { error: 'Revision ID is required' })

    try {
      const page = restoreRevision(
        params.slug,
        revisionId,
        summary || 'Restored revision',
        expectedUpdatedAt
      )
      if (!page) return fail(404, { error: 'Revision not found' })

      redirect(303, `/wiki/${page.slug}`)
    } catch (err) {
      if (isRedirect(err)) throw err
      if (err instanceof PageConflictError) {
        const current = getPage(params.slug)
        return fail(409, {
          error: 'This page was modified elsewhere. Refresh and try restoring again.',
          expectedUpdatedAt: current?.updated_at ?? null
        })
      }
      console.error('[restore revision]', err instanceof Error ? err.message : err)
      return fail(500, { error: 'Failed to restore revision — please try again.' })
    }
  }
}
