import { redirect, fail } from '@sveltejs/kit'
import { getUserByName, createSession, destroyOtherSessions } from '$lib/db/index.js'
import { verifyPasswordAsync, setSessionCookie } from '$lib/auth.js'
import { safeRedirectPath } from '$lib/safe-redirect.js'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'
import type { PageServerLoad, Actions } from './$types'

const LOGIN_LIMIT = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export const load: PageServerLoad = ({ locals, url }) => {
  const nextPath = safeRedirectPath(url.searchParams.get('next') ?? '/')
  if (locals.user) redirect(303, nextPath)
  return { next: nextPath }
}

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const clientIp = getClientAddress()
    const rateKey = `login:${clientIp}`

    if (!checkRateLimit(rateKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
      const retryAfter = rateLimitRetryAfterSeconds(rateKey)
      return fail(429, {
        error: `Too many login attempts. Try again in ${retryAfter || 60} seconds.`
      })
    }

    const formData = await request.formData()
    const username = String(formData.get('username') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (username) {
      const userRateKey = `login:user:${username.toLowerCase()}`
      if (!checkRateLimit(userRateKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
        const retryAfter = rateLimitRetryAfterSeconds(userRateKey)
        return fail(429, {
          error: `Too many login attempts. Try again in ${retryAfter || 60} seconds.`
        })
      }
    }

    const nextPath = safeRedirectPath(String(formData.get('next') ?? '/'))

    const user = getUserByName(username)
    if (!user || !(await verifyPasswordAsync(password, user.password_hash))) {
      return fail(401, { error: 'Invalid username or password', username })
    }

    const sessionId = createSession(user.id)
    destroyOtherSessions(user.id, sessionId)
    setSessionCookie(cookies, sessionId)

    redirect(303, user.must_change_pw ? '/admin/change-password' : nextPath)
  }
}
