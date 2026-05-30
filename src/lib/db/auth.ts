import { generateSessionId } from '$lib/auth.js'
import { openDatabase } from './connection.js'
import type { User } from './types.js'

export type UserSummary = Pick<User, 'id' | 'username' | 'must_change_pw' | 'is_admin' | 'created_at'>

/** Returns a user by username, or null when not found. */
export function getUserByName(username: string): User | null {
  return openDatabase().statements.getUserByName.get(username) ?? null
}

/** Returns all wiki users (metadata only). */
export function listUsers(): UserSummary[] {
  return openDatabase().statements.listUsers.all()
}

/** Creates a wiki user account. */
export function createWikiUser(
  username: string,
  passwordHash: string,
  options: { mustChangePw?: number; isAdmin?: number } = {}
): User {
  const mustChangePw = options.mustChangePw ?? 1
  const isAdmin = options.isAdmin ?? 0

  try {
    openDatabase().statements.createUser.run(username, passwordHash, mustChangePw, isAdmin)
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Username already exists')
    }
    throw error
  }

  const user = getUserByName(username)
  if (!user) throw new Error(`Failed to create user ${username}`)
  return user
}

/** Updates a user's password hash and clears the forced password-change flag. */
export function setUserPassword(userId: number, passwordHash: string): void {
  openDatabase().statements.updatePassword.run(passwordHash, userId)
}

/** Creates a new session for a user and returns its ID. */
export function createSession(userId: number): string {
  const { statements } = openDatabase()
  const sessionId = generateSessionId()
  statements.createSession.run(sessionId, userId)
  statements.pruneExpiredSessions.run()
  return sessionId
}

/** Resolves a session cookie into a logged-in user, or null when invalid. */
export function resolveSession(sessionId: string): App.Locals['user'] | null {
  const { statements } = openDatabase()
  const session = statements.getSession.get(sessionId)
  if (!session) return null

  const user = statements.getUserById.get(session.user_id)
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    mustChangePw: user.must_change_pw === 1,
    isAdmin: user.is_admin === 1
  }
}

/** Extends the session expiry when the session is still valid. */
export function touchSession(sessionId: string): void {
  openDatabase().statements.touchSession.run(sessionId)
}

/** Deletes a single session by ID. */
export function destroySession(sessionId: string): void {
  openDatabase().statements.deleteSession.run(sessionId)
}

/** Deletes all sessions for a user, optionally keeping the current one. */
export function destroyOtherSessions(userId: number, keepSessionId?: string): void {
  const { statements } = openDatabase()

  if (keepSessionId) {
    statements.deleteUserSessionsExcept.run(userId, keepSessionId)
  } else {
    statements.deleteUserSessions.run(userId)
  }
}
