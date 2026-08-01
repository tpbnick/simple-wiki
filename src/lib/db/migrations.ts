import type { Database } from './statements.js'
import type { WikiExtension } from '$lib/extensions/types.js'

type Migration = {
  id: string
  up: (db: Database) => void
}

/** Rebuilds the full-text search index from the pages table. */
function rebuildPagesFts(db: Database): void {
  try {
    db.prepare("INSERT INTO pages_fts(pages_fts) VALUES('rebuild')").run()
  } catch {
    db.prepare("INSERT INTO pages_fts(pages_fts) VALUES('delete-all')").run()
    db.prepare(
      'INSERT INTO pages_fts(rowid, title, content) SELECT id, title, content FROM pages'
    ).run()
  }
}

const CORE_MIGRATIONS: Migration[] = [
  {
    id: '001_drop_legacy_fts_triggers',
    up(db) {
      db.exec(`
        DROP TRIGGER IF EXISTS pages_ai;
        DROP TRIGGER IF EXISTS pages_ad;
        DROP TRIGGER IF EXISTS pages_au;
      `)
    }
  },
  {
    id: '002_fts_trigger_sync',
    up(db) {
      // One-time rebuild for databases upgrading from legacy FTS layouts.
      rebuildPagesFts(db)
    }
  },
  {
    id: '003_user_is_admin',
    up(db) {
      const columns = db.prepare("PRAGMA table_info('users')").all() as Array<{ name: string }>
      if (!columns.some((column) => column.name === 'is_admin')) {
        db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0')
      }
      db.exec("UPDATE users SET is_admin = 1 WHERE username = 'admin'")
    }
  },
  {
    id: '004_rate_limits_table',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at INTEGER NOT NULL
        )
      `)
    }
  },
  {
    id: '005_upload_content_hash',
    up(db) {
      const columns = db.prepare("PRAGMA table_info('uploads')").all() as Array<{ name: string }>
      if (!columns.some((column) => column.name === 'content_hash')) {
        db.exec('ALTER TABLE uploads ADD COLUMN content_hash TEXT')
      }
    }
  },
  {
    id: '006_pages_fts_triggers',
    up(db) {
      db.exec(`
        DROP INDEX IF EXISTS uploads_content_hash;
        CREATE INDEX IF NOT EXISTS uploads_content_hash ON uploads(content_hash)
        WHERE content_hash IS NOT NULL;

        CREATE TRIGGER IF NOT EXISTS pages_fts_ai AFTER INSERT ON pages BEGIN
          INSERT INTO pages_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS pages_fts_ad AFTER DELETE ON pages BEGIN
          INSERT INTO pages_fts(pages_fts, rowid) VALUES ('delete', old.id);
        END;

        CREATE TRIGGER IF NOT EXISTS pages_fts_au AFTER UPDATE OF title, content ON pages BEGIN
          INSERT INTO pages_fts(pages_fts, rowid) VALUES ('delete', old.id);
          INSERT INTO pages_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
        END;
      `)
    }
  },
  {
    id: '007_upload_content_hash_unique',
    up(db) {
      db.exec(`
        DELETE FROM uploads
        WHERE content_hash IS NOT NULL
          AND content_hash != ''
          AND id NOT IN (
            SELECT MIN(id)
            FROM uploads
            WHERE content_hash IS NOT NULL AND content_hash != ''
            GROUP BY content_hash
          );

        DROP INDEX IF EXISTS uploads_content_hash;
        CREATE UNIQUE INDEX IF NOT EXISTS uploads_content_hash ON uploads(content_hash)
        WHERE content_hash IS NOT NULL AND content_hash != '';
      `)
    }
  },
  {
    id: '008_revisions_page_id_index',
    up(db) {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_revisions_page_id ON revisions(page_id);
      `)
    }
  },
  {
    id: '009_revisions_title',
    up(db) {
      const columns = db.prepare("PRAGMA table_info('revisions')").all() as Array<{ name: string }>
      if (!columns.some((column) => column.name === 'title')) {
        db.exec('ALTER TABLE revisions ADD COLUMN title TEXT')
      }
    }
  },
  {
    id: '010_millisecond_timestamps',
    up(db) {
      db.exec(`
        DROP TRIGGER IF EXISTS pages_updated_at;
        CREATE TRIGGER IF NOT EXISTS pages_updated_at AFTER UPDATE ON pages BEGIN
          UPDATE pages SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = new.id;
        END;
      `)
    }
  }
]

function isMigrationApplied(db: Database, id: string): boolean {
  return isMigrationKeyApplied(db, `migration:${id}`)
}

function isMigrationKeyApplied(db: Database, key: string): boolean {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ? LIMIT 1').get(key) as
    | { value: string }
    | undefined
  return row?.value === '1'
}

function markMigrationApplied(db: Database, id: string): void {
  markMigrationKeyApplied(db, `migration:${id}`)
}

function markMigrationKeyApplied(db: Database, key: string): void {
  db.prepare(
    "INSERT INTO app_meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key)
}

/** Runs pending core schema migrations tracked in app_meta. */
export function runCoreMigrations(db: Database): void {
  for (const migration of CORE_MIGRATIONS) {
    if (isMigrationApplied(db, migration.id)) continue
    migration.up(db)
    markMigrationApplied(db, migration.id)
  }
}

/** Runs pending extension SQL migrations tracked in app_meta. */
export function runExtensionMigrations(db: Database, extensions: WikiExtension[]): void {
  for (const extension of extensions) {
    for (const migration of extension.migrations ?? []) {
      const key = `migration:ext:${extension.name}:${migration.id}`
      if (isMigrationKeyApplied(db, key)) continue
      db.exec(migration.sql)
      markMigrationKeyApplied(db, key)
    }
  }
}

/** Marks a legacy fts_trigger_sync row as migrated when upgrading old databases. */
export function migrateLegacyFtsMeta(db: Database): void {
  const legacy = db
    .prepare("SELECT value FROM app_meta WHERE key = 'fts_trigger_sync' LIMIT 1")
    .get() as { value: string } | undefined

  if (!legacy) return

  if (!isMigrationApplied(db, '002_fts_trigger_sync')) {
    markMigrationApplied(db, '002_fts_trigger_sync')
  }
  if (!isMigrationApplied(db, '001_drop_legacy_fts_triggers')) {
    markMigrationApplied(db, '001_drop_legacy_fts_triggers')
  }
}
