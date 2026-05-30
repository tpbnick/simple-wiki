import BetterSqlite3 from 'better-sqlite3'
import { readFileSync } from 'fs'
import { hashPassword } from '$lib/auth.js'
import { resolveUploadPath, uploadContentHash } from '$lib/uploads.js'
import type { WikiExtension } from '$lib/extensions/types.js'
import { SCHEMA } from './schema.js'
import { buildStatements, type Database, type Statements } from './statements.js'
import { HOME_CONTENT, HELP_CONTENT } from './defaults.js'
import { migrateLegacyFtsMeta, runCoreMigrations, runExtensionMigrations } from './migrations.js'
import { invalidatePageSlugCache } from './slug-cache.js'
import { assertDatabaseAvailable } from './swap-lock.js'

const UPLOAD_HASH_BATCH_SIZE = 25

let database: Database | null = null
let statements: Statements | null = null
let extensionSchemasApplied = false

/** Resolved SQLite database file path. */
export function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH ?? './wiki.db'
}

/**
 * Closes and clears the database singleton. Intended for tests.
 */
export function resetDatabaseConnection(): void {
  database?.close()
  database = null
  statements = null
  extensionSchemasApplied = false
  invalidatePageSlugCache()
}

function scheduleUploadHashBackfill(db: Database): void {
  const pending = db
    .prepare("SELECT filename FROM uploads WHERE content_hash IS NULL OR content_hash = ''")
    .all() as Array<{ filename: string }>

  if (pending.length === 0) return

  const updateHash = db.prepare('UPDATE uploads SET content_hash = ? WHERE filename = ?')

  let index = 0

  const processBatch = () => {
    const batch = pending.slice(index, index + UPLOAD_HASH_BATCH_SIZE)
    index += UPLOAD_HASH_BATCH_SIZE

    for (const { filename } of batch) {
      const filePath = resolveUploadPath(filename)
      if (!filePath) continue

      let buffer: Buffer
      try {
        buffer = readFileSync(filePath)
      } catch {
        continue
      }

      const hash = uploadContentHash(buffer)
      updateHash.run(hash, filename)
    }

    if (index < pending.length) {
      setImmediate(processBatch)
    }
  }

  setImmediate(processBatch)
}

function ensureHelpPage(preparedStatements: Statements) {
  if (preparedStatements.getPage.get('help')) return

  preparedStatements.upsertPage.run({
    slug: 'help',
    title: 'Help',
    content: HELP_CONTENT,
    namespace: 'help'
  })
}

function ensureAdminUser(preparedStatements: Statements) {
  if (preparedStatements.getUserByName.get('admin')) return

  preparedStatements.createUser.run('admin', hashPassword('admin'), 1, 1)
}

function ensureHomePage(preparedStatements: Statements) {
  if (preparedStatements.getPage.get('home')) return

  preparedStatements.upsertPage.run({
    slug: 'home',
    title: 'Welcome',
    content: HOME_CONTENT,
    namespace: 'article'
  })
}

/** Applies extension SQL schemas once per process after extensions are loaded. */
export function applyExtensionSchemas(extensions: WikiExtension[]) {
  if (extensionSchemasApplied) return
  extensionSchemasApplied = true

  const { db } = openDatabase()
  for (const extension of extensions) {
    if (extension.schema) {
      // Extension authors must use IF NOT EXISTS — schemas may run again after restore.
      db.exec(extension.schema)
    }
  }
  runExtensionMigrations(db, extensions)
}

/** Returns the shared database connection, opening it on first use. */
export function openDatabase(options?: { duringImport?: boolean }) {
  if (database && statements) return { db: database, statements }

  if (!options?.duringImport) {
    assertDatabaseAvailable()
  }

  const db = new BetterSqlite3(resolveDatabasePath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)

  migrateLegacyFtsMeta(db)
  runCoreMigrations(db)

  const preparedStatements = buildStatements(db)
  database = db
  statements = preparedStatements

  scheduleUploadHashBackfill(db)
  ensureAdminUser(preparedStatements)
  ensureHomePage(preparedStatements)
  ensureHelpPage(preparedStatements)

  return { db, statements: preparedStatements }
}

/** Returns the shared SQLite handle (opens the database if needed). */
export function getDatabase(): Database {
  return openDatabase().db
}
