#!/usr/bin/env node
/**
 * Reset a wiki user's password from the shell (local dev or Docker exec).
 *
 *   node scripts/reset-password.mjs --list
 *   node scripts/reset-password.mjs admin
 *   node scripts/reset-password.mjs admin 'new-password-here'
 */
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')

const BCRYPT_ROUNDS = 12
const MIN_PASSWORD_LENGTH = 8

function usage() {
  console.error(`Usage:
  node scripts/reset-password.mjs --list
  node scripts/reset-password.mjs <username> [password]

If password is omitted, a random one is generated and printed.
Uses DATABASE_PATH (default: ./wiki.db; Docker image sets /data/wiki.db).`)
}

function resolveDatabasePath() {
  return resolve(process.env.DATABASE_PATH ?? './wiki.db')
}

function generatePassword(length = 16) {
  const characters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const maxUnbiased = Math.floor(256 / characters.length) * characters.length
  const result = []

  while (result.length < length) {
    for (const byte of randomBytes(length - result.length)) {
      if (byte >= maxUnbiased) continue
      result.push(characters[byte % characters.length])
      if (result.length >= length) break
    }
  }

  return result.join('')
}

function listUsers(db) {
  const users = db
    .prepare('SELECT username, is_admin, must_change_pw FROM users ORDER BY username ASC')
    .all()

  if (users.length === 0) {
    console.log('No users found.')
    return
  }

  console.log('Username\tAdmin\tMust change password')
  for (const user of users) {
    console.log(`${user.username}\t${user.is_admin ? 'yes' : 'no'}\t${user.must_change_pw ? 'yes' : 'no'}`)
  }
}

function resetPassword(db, username, password) {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (!user) {
    console.error(`User not found: ${username}`)
    process.exit(1)
  }

  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
  db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 1 WHERE id = ?').run(hash, user.id)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
}

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  usage()
  process.exit(args.length === 0 ? 1 : 0)
}

const dbPath = resolveDatabasePath()
let db

try {
  db = new Database(dbPath)
} catch (error) {
  console.error(`Could not open database at ${dbPath}`)
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

try {
  if (args[0] === '--list' || args[0] === '-l') {
    listUsers(db)
    process.exit(0)
  }

  const username = args[0]
  const password = args[1] ?? generatePassword(16)

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    process.exit(1)
  }

  resetPassword(db, username, password)

  console.log(`Password reset for: ${username}`)
  console.log(`Temporary password: ${password}`)
  console.log('Existing sessions were revoked. User must change password on next login.')
} finally {
  db.close()
}
