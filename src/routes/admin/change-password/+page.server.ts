import { redirect, fail } from '@sveltejs/kit'
import { setUserPassword, destroyOtherSessions, getUserByName } from '$lib/db/index.js'
import { hashPasswordAsync, verifyPasswordAsync, SESSION_COOKIE_NAME } from '$lib/auth.js'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'
import type { PageServerLoad, Actions } from './$types'

const PASSWORD_CHANGE_LIMIT = 8
const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, '/login')
  return { mustChange: locals.user.mustChangePw }
}

export const actions: Actions = {
  default: async ({ request, locals, cookies, getClientAddress }) => {
    if (!locals.user) redirect(303, '/login')

    const rateKey = `change-password:${getClientAddress()}`
    if (!checkRateLimit(rateKey, PASSWORD_CHANGE_LIMIT, PASSWORD_CHANGE_WINDOW_MS)) {
      const retryAfter = rateLimitRetryAfterSeconds(rateKey)
      return fail(429, {
        error: `Too many attempts. Try again in ${retryAfter || 60} seconds.`
      })
    }

    const formData = await request.formData()
    const currentPassword = String(formData.get('current') ?? '')
    const newPassword = String(formData.get('next_password') ?? '')
    const confirmPassword = String(formData.get('confirm') ?? '')

    const userRateKey = `change-password:user:${locals.user.username.toLowerCase()}`
    if (!checkRateLimit(userRateKey, PASSWORD_CHANGE_LIMIT, PASSWORD_CHANGE_WINDOW_MS)) {
      const retryAfter = rateLimitRetryAfterSeconds(userRateKey)
      return fail(429, {
        error: `Too many attempts. Try again in ${retryAfter || 60} seconds.`
      })
    }

    if (!newPassword || newPassword.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters' })
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' })
    }

    if (!locals.user.mustChangePw) {
      const user = getUserByName(locals.user.username)

      if (!user || !(await verifyPasswordAsync(currentPassword, user.password_hash))) {
        return fail(401, { error: 'Current password is incorrect' })
      }
    }

    setUserPassword(locals.user.id, await hashPasswordAsync(newPassword))
    destroyOtherSessions(locals.user.id, cookies.get(SESSION_COOKIE_NAME))
    redirect(303, '/admin')
  }
}
