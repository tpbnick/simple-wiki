import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPasswordAsync } from '$lib/auth.js'
import { getPage, getUserByName, resetDatabaseConnection } from '$lib/db/index.js'
import { openDatabase } from '$lib/db/connection.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-seed-test-')

describe('seed pages', () => {
  it('creates the help page on first open', () => {
    const help = getPage('help')
    expect(help).not.toBeNull()
    expect(help?.namespace).toBe('help')
    expect(help?.title).toBe('Help')
    expect(help?.content).toContain('Wiki help')
  })
})

describe('seed admin user', () => {
  it('creates admin with default password and must_change_pw on first open', async () => {
    const user = getUserByName('admin')
    expect(user).not.toBeNull()
    expect(user?.must_change_pw).toBe(1)
    expect(user?.is_admin).toBe(1)
    expect(await verifyPasswordAsync('admin', user!.password_hash)).toBe(true)
  })

  it('does not reset admin password when the database is reopened', async () => {
    const { statements } = openDatabase()
    const admin = getUserByName('admin')
    expect(admin).not.toBeNull()

    const customHash = hashPassword('secret-password')
    statements.updatePassword.run(customHash, admin!.id)

    resetDatabaseConnection()
    openDatabase()

    const reopened = getUserByName('admin')
    expect(reopened).not.toBeNull()
    expect(await verifyPasswordAsync('secret-password', reopened!.password_hash)).toBe(true)
    expect(await verifyPasswordAsync('admin', reopened!.password_hash)).toBe(false)
  })
})
