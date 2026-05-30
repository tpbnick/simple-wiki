import { describe, expect, it } from 'vitest'
import { generatePassword, usesSecureCookies } from '$lib/auth.js'

describe('generatePassword', () => {
  it('returns passwords of the requested length', () => {
    expect(generatePassword(14)).toHaveLength(14)
  })

  it('uses only characters from the configured alphabet', () => {
    const allowed = /^[abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/
    expect(generatePassword(32)).toMatch(allowed)
  })
})

describe('usesSecureCookies', () => {
  it('honors explicit COOKIE_SECURE=false', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalCookieSecure = process.env.COOKIE_SECURE

    try {
      process.env.NODE_ENV = 'production'
      process.env.COOKIE_SECURE = 'false'
      expect(usesSecureCookies()).toBe(false)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      process.env.COOKIE_SECURE = originalCookieSecure
    }
  })

  it('defaults to secure cookies in production', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalCookieSecure = process.env.COOKIE_SECURE

    try {
      process.env.NODE_ENV = 'production'
      delete process.env.COOKIE_SECURE
      expect(usesSecureCookies()).toBe(true)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      process.env.COOKIE_SECURE = originalCookieSecure
    }
  })
})
