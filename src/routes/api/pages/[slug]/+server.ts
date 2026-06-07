import { json, error } from '@sveltejs/kit'
import { getPage, deletePage, ProtectedPageError } from '$lib/db/index.js'
import { readJsonBody } from '$lib/http.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import { persistWikiPage, MAX_PAGE_CONTENT_BYTES } from '$lib/server/page-save.js'
import type { RequestHandler } from './$types'

const MAX_PAGE_BODY_BYTES = MAX_PAGE_CONTENT_BYTES

export const GET: RequestHandler = ({ params, locals, getClientAddress }) => {
  requireReadAccess(locals)
  enforceReadRateLimit(getClientAddress, 'page-read')

  const page = getPage(params.slug)
  if (!page) error(404, 'Not found')
  return json(page)
}

export const PUT: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'pages-save')

  const body = (await readJsonBody(request, MAX_PAGE_BODY_BYTES)) as Record<string, unknown>
  const fields = {
    title: typeof body.title === 'string' ? body.title : '',
    content: typeof body.content === 'string' ? body.content : '',
    namespace: typeof body.namespace === 'string' ? body.namespace : 'article',
    summary: typeof body.summary === 'string' ? body.summary : '',
    expectedUpdatedAt: typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : null
  }

  const result = persistWikiPage({
    routeSlug: params.slug,
    fields,
    requireExpectedUpdatedWhenExisting: true
  })

  if (!result.ok) {
    if (result.type === 'validation') {
      error(result.status, result.message)
    }
    if (result.type === 'duplicate') {
      error(409, result.message)
    }
    if (result.type === 'conflict') {
      return json(
        {
          error: result.message,
          expectedUpdatedAt: result.expectedUpdatedAt
        },
        { status: 409 }
      )
    }
  }

  return json(result.page)
}

export const DELETE: RequestHandler = ({ params, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'pages-delete')

  try {
    const deleted = deletePage(params.slug)
    if (!deleted) error(404, 'Not found')
    return json({ ok: true })
  } catch (e) {
    if (e instanceof ProtectedPageError) {
      error(403, e.message)
    }
    throw e
  }
}
