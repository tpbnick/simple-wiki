import { getExtensionWriteGuardPaths } from '$lib/extensions/server.js'

/** Route prefixes that require a logged-in user for non-GET requests. */
const BASE_WRITE_PATHS = [
  '/admin',
  '/recent',
  '/wiki',
  '/api/upload',
  '/api/admin',
  '/api/pages'
] as const

/** Returns true when an unauthenticated write should be rejected. */
export function requiresLoginForWrite(pathname: string, method: string): boolean {
  if (method === 'GET' || method === 'HEAD') return false

  const paths = [...BASE_WRITE_PATHS, ...getExtensionWriteGuardPaths()]
  return paths.some((path) => pathname.startsWith(path))
}

/** API routes allowed while the user must change their password. */
export function isPasswordChangeAllowedApi(pathname: string): boolean {
  return PASSWORD_CHANGE_ALLOWED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const PASSWORD_CHANGE_ALLOWED_API_PREFIXES = [] as const

/** Page routes allowed while the user must change their password. */
export function isPasswordChangeAllowedPage(pathname: string, method: string): boolean {
  return pathname === '/admin/change-password' || (pathname === '/logout' && method === 'POST')
}
