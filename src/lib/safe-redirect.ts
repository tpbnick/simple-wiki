const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9/._%-]*$/

/**
 * Returns a safe same-origin redirect path, blocking open redirects.
 * @param next - Requested redirect target from a query parameter or form field.
 * @param fallback - Path to use when next is missing or unsafe.
 */
export function safeRedirectPath(next: string, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback
  }

  if (next.includes('..') || /[\u0000-\u001F\u007F]/.test(next)) return fallback

  const [pathname] = next.split(/[?#]/)
  if (!SAFE_PATH_PATTERN.test(pathname)) return fallback

  return next
}
