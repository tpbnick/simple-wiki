import { usesSecureCookies } from '$lib/auth.js'

/** Security headers applied to every HTML and API response (CSP is configured in svelte.config.ts). */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

if (usesSecureCookies()) {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
}

/**
 * Applies shared security headers to a response.
 * @param response - Response returned from SvelteKit resolve().
 */
export function applySecurityHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
}
