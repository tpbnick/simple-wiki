import { json, error } from '@sveltejs/kit'
import { renderWikiContentForDisplay } from '$lib/wiki-render.js'
import { readJsonBody } from '$lib/http.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import type { RequestHandler } from './$types'

const MAX_RENDER_BODY_BYTES = 2 * 1024 * 1024

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'render')

  const body = (await readJsonBody(request, MAX_RENDER_BODY_BYTES)) as Record<string, unknown>
  const { content } = body

  if (typeof content !== 'string') {
    return json({ error: 'content must be a string' }, { status: 400 })
  }

  const html = await renderWikiContentForDisplay(content, { canEdit: true })
  return json({ html })
}
