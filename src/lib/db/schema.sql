-- Core wiki schema (runtime source of truth). Loaded by src/lib/db/schema.ts.
-- PRAGMA journal_mode and foreign_keys are applied in connection.ts.
-- FTS incremental triggers are created in migration 006_pages_fts_triggers.
-- Extension tables live in extensions/<name>/schema.sql.

CREATE TABLE IF NOT EXISTS pages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT    UNIQUE NOT NULL,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL DEFAULT '',
  namespace  TEXT    NOT NULL DEFAULT 'article',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE IF NOT EXISTS revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  summary    TEXT    NOT NULL DEFAULT '',
  title      TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  must_change_pw  INTEGER NOT NULL DEFAULT 0,
  is_admin        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  mime_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  content_hash  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title, content,
  content = pages,
  content_rowid = id
);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS pages_updated_at AFTER UPDATE ON pages BEGIN
  UPDATE pages SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = new.id;
END;
