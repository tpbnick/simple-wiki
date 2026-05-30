import { describe, expect, it } from 'vitest'
import { applySecurityHeaders, SECURITY_HEADERS } from '$lib/security-headers.js'
import { usesSecureCookies } from '$lib/auth.js'

describe('security headers', () => {
  it('applies the shared security headers to a response', () => {
    const response = applySecurityHeaders(new Response('ok'))

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value)
    }
  })

  it('includes HSTS only when secure cookies are enabled', () => {
    if (usesSecureCookies()) {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBeDefined()
    } else {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBeUndefined()
    }
  })
})
