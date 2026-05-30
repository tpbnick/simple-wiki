import { fail } from '@sveltejs/kit'
import {
  AUTHENTICATED_WRITE_LIMIT,
  AUTHENTICATED_WRITE_WINDOW_MS,
  checkAuthenticatedWriteRateLimit
} from '$lib/api-rate-limit.js'

/** Returns a rate-limit error message, or null when the request is allowed. */
export function formWriteRateLimitMessage(
  locals: App.Locals,
  getClientAddress: () => string,
  label: string,
  limit = AUTHENTICATED_WRITE_LIMIT,
  windowMs = AUTHENTICATED_WRITE_WINDOW_MS
): string | null {
  if (!locals.user) return null

  const retryAfter = checkAuthenticatedWriteRateLimit(
    locals,
    getClientAddress,
    label,
    limit,
    windowMs
  )
  if (retryAfter == null) return null

  return `Too many requests. Try again in ${retryAfter || 60} seconds.`
}

/** Applies authenticated write rate limits to form actions. */
export function enforceFormWriteRateLimit(
  locals: App.Locals,
  getClientAddress: () => string,
  label: string,
  options: { field?: string; tab?: string; limit?: number; windowMs?: number } = {}
) {
  const message = formWriteRateLimitMessage(
    locals,
    getClientAddress,
    label,
    options.limit,
    options.windowMs
  )
  if (!message) return

  const field = options.field ?? 'error'
  return fail(429, {
    [field]: message,
    ...(options.tab ? { tab: options.tab } : {})
  })
}
