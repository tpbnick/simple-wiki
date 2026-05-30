import { describe, expect, it } from 'vitest'
import { requireAuthenticated, requireAuthenticatedPage } from './auth-access.js'

describe('requireAuthenticated', () => {
  it('throws 401 when user is missing', () => {
    expect(() => requireAuthenticated({})).toThrowError(expect.objectContaining({ status: 401 }))
  })

  it('allows authenticated users', () => {
    expect(() =>
      requireAuthenticated({
        user: { id: 1, username: 'editor', mustChangePw: false, isAdmin: false }
      })
    ).not.toThrow()
  })
})

describe('requireAuthenticatedPage', () => {
  it('redirects to login with next when user is missing', () => {
    expect(() => requireAuthenticatedPage({}, { next: '/wiki/foo/edit' })).toThrowError(
      expect.objectContaining({ status: 303, location: '/login?next=%2Fwiki%2Ffoo%2Fedit' })
    )
  })
})
