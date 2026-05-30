import { redirect } from '@sveltejs/kit'
import { destroySession } from '$lib/db/index.js'
import { clearSessionCookie, SESSION_COOKIE_NAME } from '$lib/auth.js'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = ({ cookies }) => {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)
  if (sessionId) {
    destroySession(sessionId)
  }
  clearSessionCookie(cookies)
  redirect(303, '/')
}
