import { describe, expect, it } from 'vitest'
import {
  enforceFormWriteRateLimit,
  formWriteRateLimitMessage
} from '$lib/server/form-rate-limit.js'
import { resetDatabaseConnection } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-form-rate-limit-')

const user: App.Locals['user'] = {
  id: 1,
  username: 'admin',
  isAdmin: true,
  mustChangePw: false
}

describe('formWriteRateLimitMessage', () => {
  it('returns null when the caller is not authenticated', () => {
    expect(formWriteRateLimitMessage({} as App.Locals, () => '127.0.0.1', 'pages-save')).toBeNull()
  })

  it('returns null when under the limit', () => {
    expect(formWriteRateLimitMessage({ user }, () => '127.0.0.1', 'pages-save-test')).toBeNull()
  })

  it('returns a message when the limit is exceeded', () => {
    const address = '127.0.0.2'
    for (let i = 0; i < 120; i++) {
      formWriteRateLimitMessage({ user }, () => address, 'pages-save-blocked')
    }

    expect(formWriteRateLimitMessage({ user }, () => address, 'pages-save-blocked')).toMatch(
      /Too many requests/
    )
  })

  it('honors custom limit and window options', () => {
    resetDatabaseConnection()
    const address = '127.0.0.3'

    expect(formWriteRateLimitMessage({ user }, () => address, 'custom-limit', 1, 60_000)).toBeNull()
    expect(formWriteRateLimitMessage({ user }, () => address, 'custom-limit', 1, 60_000)).toMatch(
      /Too many requests/
    )
  })
})

describe('enforceFormWriteRateLimit', () => {
  it('returns fail(429) with the configured field and tab', () => {
    resetDatabaseConnection()
    const address = '127.0.0.4'

    for (let i = 0; i < 120; i++) {
      enforceFormWriteRateLimit({ user }, () => address, 'form-save-blocked')
    }

    const result = enforceFormWriteRateLimit({ user }, () => address, 'form-save-blocked', {
      field: 'userError',
      tab: 'users'
    })

    expect(result?.status).toBe(429)
    expect(result?.data).toMatchObject({
      userError: expect.stringMatching(/Too many requests/),
      tab: 'users'
    })
  })
})
