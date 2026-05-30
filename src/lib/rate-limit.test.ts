import { describe, expect, it } from 'vitest'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'
import { resetDatabaseConnection } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-rate-limit-test-')

describe('checkRateLimit', () => {
  it('allows requests up to the configured limit', () => {
    const key = 'test-ip'
    expect(checkRateLimit(key, 3, 60_000)).toBe(true)
    expect(checkRateLimit(key, 3, 60_000)).toBe(true)
    expect(checkRateLimit(key, 3, 60_000)).toBe(true)
    expect(checkRateLimit(key, 3, 60_000)).toBe(false)
  })

  it('resets after the window expires', () => {
    const key = 'expiring-ip'
    const now = Date.now()

    expect(checkRateLimit(key, 1, 1000, now)).toBe(true)
    expect(checkRateLimit(key, 1, 1000, now + 500)).toBe(false)
    expect(checkRateLimit(key, 1, 1000, now + 1001)).toBe(true)
  })

  it('reports retry-after seconds for blocked keys', () => {
    const key = 'blocked-ip'
    const now = Date.now()

    checkRateLimit(key, 1, 10_000, now)
    checkRateLimit(key, 1, 10_000, now + 1000)

    expect(rateLimitRetryAfterSeconds(key, now + 1000)).toBeGreaterThan(0)
  })

  it('persists limits across database reconnects', () => {
    const key = 'persist-ip'
    expect(checkRateLimit(key, 2, 60_000)).toBe(true)
    expect(checkRateLimit(key, 2, 60_000)).toBe(true)
    expect(checkRateLimit(key, 2, 60_000)).toBe(false)

    resetDatabaseConnection()
    expect(checkRateLimit(key, 2, 60_000)).toBe(false)
  })
})
