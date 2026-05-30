import { error } from '@sveltejs/kit'
import { requireAuthenticated } from '$lib/auth-access.js'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'

export const AUTHENTICATED_WRITE_LIMIT = 120
export const AUTHENTICATED_WRITE_WINDOW_MS = 15 * 60 * 1000

function authenticatedWriteRateKey(
  locals: App.Locals,
  getClientAddress: () => string,
  label: string
): string {
  return `${label}:${getClientAddress()}:${locals.user!.id}`
}

/**
 * Returns retry-after seconds when limited, or null when the request is allowed.
 * Caller must ensure `locals.user` is set.
 */
export function checkAuthenticatedWriteRateLimit(
  locals: App.Locals,
  getClientAddress: () => string,
  label: string,
  limit = AUTHENTICATED_WRITE_LIMIT,
  windowMs = AUTHENTICATED_WRITE_WINDOW_MS
): number | null {
  const rateKey = authenticatedWriteRateKey(locals, getClientAddress, label)
  if (checkRateLimit(rateKey, limit, windowMs)) return null
  return rateLimitRetryAfterSeconds(rateKey)
}

/** Applies a per-user write rate limit for authenticated API routes. */
export function enforceAuthenticatedWriteRateLimit(
  locals: App.Locals,
  getClientAddress: () => string,
  label: string,
  limit = AUTHENTICATED_WRITE_LIMIT,
  windowMs = AUTHENTICATED_WRITE_WINDOW_MS
): void {
  requireAuthenticated(locals)

  const retryAfter = checkAuthenticatedWriteRateLimit(
    locals,
    getClientAddress,
    label,
    limit,
    windowMs
  )
  if (retryAfter != null) {
    error(429, `Too many requests. Try again in ${retryAfter || 60} seconds.`)
  }
}
