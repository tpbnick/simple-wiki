import { describe, expect, it } from 'vitest'
import {
  isPasswordChangeAllowedApi,
  isPasswordChangeAllowedPage,
  requiresLoginForWrite
} from '$lib/auth-guards.js'

describe('requiresLoginForWrite', () => {
  it('allows anonymous GET requests', () => {
    expect(requiresLoginForWrite('/wiki/foo/edit', 'GET')).toBe(false)
  })

  it('requires login for wiki edits', () => {
    expect(requiresLoginForWrite('/wiki/foo/edit', 'POST')).toBe(true)
  })

  it('requires login for nested admin API routes', () => {
    expect(requiresLoginForWrite('/api/pages/my-page', 'DELETE')).toBe(true)
  })
})

describe('password change guards', () => {
  it('allows password change page and logout', () => {
    expect(isPasswordChangeAllowedPage('/admin/change-password', 'GET')).toBe(true)
    expect(isPasswordChangeAllowedPage('/logout', 'POST')).toBe(true)
    expect(isPasswordChangeAllowedPage('/wiki/home/edit', 'POST')).toBe(false)
  })

  it('blocks all APIs during password change', () => {
    expect(isPasswordChangeAllowedApi('/api/render')).toBe(false)
    expect(isPasswordChangeAllowedApi('/api/upload')).toBe(false)
    expect(isPasswordChangeAllowedApi('/api/pages/foo')).toBe(false)
  })
})
