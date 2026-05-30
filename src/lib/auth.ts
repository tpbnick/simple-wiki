import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { Cookies } from '@sveltejs/kit'

const BCRYPT_ROUNDS = 12
const SESSION_COOKIE_NAME = 'wiki-session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true
  if (process.env.COOKIE_SECURE === 'false') return false
  return process.env.NODE_ENV === 'production'
}

/** True when session cookies require HTTPS (also controls HSTS). */
export function usesSecureCookies(): boolean {
  return cookieSecure()
}

/**
 * Hashes a plaintext password for storage.
 * @param password - Plaintext password to hash.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS)
}

/**
 * Checks a plaintext password against a stored hash without blocking other work.
 * @param password - Plaintext password to verify.
 * @param hash - Stored bcrypt hash.
 */
export async function verifyPasswordAsync(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Hashes a plaintext password without blocking other work.
 * @param password - Plaintext password to hash.
 */
export async function hashPasswordAsync(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Generates a random password using URL-safe characters without modulo bias.
 * @param length - Number of characters to generate.
 */
export function generatePassword(length = 16): string {
  const characters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const maxUnbiased = Math.floor(256 / characters.length) * characters.length
  const result: string[] = []

  while (result.length < length) {
    for (const byte of randomBytes(length - result.length)) {
      if (byte >= maxUnbiased) continue
      result.push(characters[byte % characters.length])
      if (result.length >= length) break
    }
  }

  return result.join('')
}

/**
 * Generates a random session identifier.
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Stores the session cookie after a successful login.
 * @param cookies - SvelteKit cookie helper from the request event.
 * @param sessionId - Session ID returned by createSession.
 */
export function setSessionCookie(cookies: Cookies, sessionId: string): void {
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    maxAge: SESSION_MAX_AGE_SECONDS
  })
}

/**
 * Clears the session cookie on logout.
 * @param cookies - SvelteKit cookie helper from the request event.
 */
export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' })
}

export { SESSION_COOKIE_NAME }
