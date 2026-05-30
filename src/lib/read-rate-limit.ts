import { error } from '@sveltejs/kit'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'

export const READ_API_LIMIT = 120
export const READ_API_WINDOW_MS = 60 * 1000

/** Applies a per-IP rate limit to unauthenticated or authenticated read APIs. */
export function enforceReadRateLimit(
  getClientAddress: () => string,
  label: string,
  limit = READ_API_LIMIT,
  windowMs = READ_API_WINDOW_MS
): void {
  const key = `read:${label}:${getClientAddress()}`
  if (!checkRateLimit(key, limit, windowMs)) {
    const retryAfter = rateLimitRetryAfterSeconds(key)
    error(429, `Too many requests. Try again in ${retryAfter || 60} seconds.`)
  }
}
