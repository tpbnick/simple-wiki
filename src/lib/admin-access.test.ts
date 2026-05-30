import { isHttpError } from '@sveltejs/kit'
import { describe, expect, it } from 'vitest'
import { requireAdmin, requireAdminPage } from '$lib/admin-access.js'

describe('requireAdmin', () => {
  it('rejects anonymous users', () => {
    try {
      requireAdmin({})
      expect.fail('expected requireAdmin to throw')
    } catch (error) {
      expect(isHttpError(error, 401)).toBe(true)
    }
  })

  it('rejects non-admin users', () => {
    try {
      requireAdmin({
        user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
      })
      expect.fail('expected requireAdmin to throw')
    } catch (error) {
      expect(isHttpError(error, 403)).toBe(true)
    }
  })

  it('allows admin users', () => {
    expect(() =>
      requireAdmin({
        user: { id: 1, username: 'admin', mustChangePw: false, isAdmin: true }
      })
    ).not.toThrow()
  })
})

describe('requireAdminPage', () => {
  it('rejects non-admin signed-in users', () => {
    try {
      requireAdminPage({
        user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
      })
      expect.fail('expected requireAdminPage to throw')
    } catch (error) {
      expect(isHttpError(error, 403)).toBe(true)
    }
  })
})
