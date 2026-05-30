import { openDatabase } from '$lib/db/connection.js'

let cleanupCounter = 0
let startupCleanupDone = false

function cleanupExpiredRateLimits(now: number): void {
  openDatabase().statements.deleteExpiredRateLimits.run(now)
}

/**
 * Returns true when the key is within the allowed rate limit window.
 * Buckets are stored in SQLite so limits survive process restarts.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): boolean {
  const { db, statements } = openDatabase()

  return db.transaction(() => {
    if (!startupCleanupDone) {
      cleanupExpiredRateLimits(now)
      startupCleanupDone = true
    }

    cleanupCounter += 1
    if (cleanupCounter % 100 === 0) {
      cleanupExpiredRateLimits(now)
    }

    const row = statements.getRateLimit.get(key)

    if (!row || now >= row.reset_at) {
      statements.upsertRateLimitWindow.run(key, now + windowMs)
      return true
    }

    if (row.count >= limit) return false

    statements.incrementRateLimit.run(key)
    return true
  })()
}

/** Returns remaining seconds until the rate limit resets for a key. */
export function rateLimitRetryAfterSeconds(key: string, now = Date.now()): number {
  const row = openDatabase().statements.getRateLimitResetAt.get(key)

  if (!row) return 0
  return Math.max(0, Math.ceil((row.reset_at - now) / 1000))
}

/** Clears all rate-limit buckets. Intended for tests. */
export function resetRateLimits(): void {
  openDatabase().statements.deleteAllRateLimits.run()
  cleanupCounter = 0
  startupCleanupDone = false
}
