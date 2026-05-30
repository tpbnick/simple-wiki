import { createRequire } from 'module'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { getUserByName } from '$lib/db/index.js'
import { openDatabase } from '$lib/db/connection.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

const requireModule = createRequire(import.meta.url)
const env = installTempWikiEnv('wiki-migrate-test-')

describe('core migrations', () => {
  it('adds is_admin when opening a database created before that column existed', () => {
    const dbPath = join(env.tempDir, 'legacy.db')
    const Database = requireModule('better-sqlite3') as typeof import('better-sqlite3')
    const legacyDb = new Database(dbPath)

    legacyDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        must_change_pw INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO users (username, password_hash, must_change_pw)
      VALUES ('admin', 'hash', 0);
    `)
    legacyDb.close()

    process.env.DATABASE_PATH = dbPath
    openDatabase()

    const admin = getUserByName('admin')
    expect(admin).not.toBeNull()
    expect(admin?.is_admin).toBe(1)
  })
})
