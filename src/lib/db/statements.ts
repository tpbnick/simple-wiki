import type BetterSqlite3 from 'better-sqlite3'
import type {
  Page,
  PageSummary,
  Revision,
  SearchResult,
  SearchSuggestion,
  Upload,
  User
} from './types.js'

export const SEARCHABLE_NAMESPACE_SQL = "p.namespace != 'template'"

export type Database = BetterSqlite3.Database

export function buildStatements(db: Database) {
  return {
    getPage: db.prepare<[string], Page>('SELECT * FROM pages WHERE slug = ? LIMIT 1'),
    getAllPages: db.prepare<[], Page>('SELECT * FROM pages ORDER BY updated_at DESC'),
    getAllPageSummaries: db.prepare<[], PageSummary>(
      'SELECT id, slug, title, namespace, created_at, updated_at FROM pages ORDER BY updated_at DESC'
    ),
    getPageSummariesByNamespace: db.prepare<[string], PageSummary>(
      'SELECT id, slug, title, namespace, created_at, updated_at FROM pages WHERE namespace = ? ORDER BY title ASC'
    ),
    countContentPageSummaries: db.prepare<[string, string, string], { count: number }>(`
      SELECT COUNT(*) AS count FROM pages
      WHERE namespace != 'template'
        AND (? = '' OR lower(title) LIKE lower(?) OR lower(slug) LIKE lower(?))
    `),
    searchContentPageSummaries: db.prepare<[string, string, string, number, number], PageSummary>(`
      SELECT id, slug, title, namespace, created_at, updated_at FROM pages
      WHERE namespace != 'template'
        AND (? = '' OR lower(title) LIKE lower(?) OR lower(slug) LIKE lower(?))
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `),
    countAllContentPages: db.prepare<[], { count: number }>(
      "SELECT COUNT(*) AS count FROM pages WHERE namespace != 'template'"
    ),
    upsertPage: db.prepare(`
      INSERT INTO pages (slug, title, content, namespace)
      VALUES (@slug, @title, @content, @namespace)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title, content = excluded.content, namespace = excluded.namespace
    `),
    deletePage: db.prepare('DELETE FROM pages WHERE slug = ?'),
    saveRevision: db.prepare<[number, string, string, string | null]>(
      'INSERT INTO revisions (page_id, content, summary, title) VALUES (?, ?, ?, ?)'
    ),
    getRevisions: db.prepare<[string], Revision>(`
      SELECT r.* FROM revisions r JOIN pages p ON p.id = r.page_id
      WHERE p.slug = ? ORDER BY r.created_at DESC, r.id DESC
    `),
    getRevisionById: db.prepare<[number], Revision>('SELECT * FROM revisions WHERE id = ? LIMIT 1'),
    getRevisionDiffContext: db.prepare<
      [number],
      {
        old_content: string
        page_content: string
        next_revision_content: string | null
      }
    >(`
      SELECT
        r.content AS old_content,
        p.content AS page_content,
        (
          SELECT r2.content FROM revisions r2
          WHERE r2.page_id = r.page_id
            AND (r2.created_at > r.created_at OR (r2.created_at = r.created_at AND r2.id > r.id))
          ORDER BY r2.created_at ASC, r2.id ASC
          LIMIT 1
        ) AS next_revision_content
      FROM revisions r
      INNER JOIN pages p ON p.id = r.page_id
      WHERE r.id = ?
      LIMIT 1
    `),
    getRecentRevisions: db.prepare<
      [number],
      {
        id: number
        summary: string
        created_at: string
        slug: string
        title: string
        namespace: string
      }
    >(`
      SELECT r.id, r.summary, r.created_at, p.slug, p.title, p.namespace
      FROM revisions r
      INNER JOIN pages p ON p.id = r.page_id
      WHERE p.namespace != 'template'
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ?
    `),
    pruneRevisionsOverLimit: db.prepare(`
      DELETE FROM revisions
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY page_id ORDER BY created_at DESC, id DESC
          ) AS rn
          FROM revisions
        )
        WHERE rn > ?
      )
    `),
    prunePageRevisionsOverLimit: db.prepare(`
      DELETE FROM revisions
      WHERE page_id = ?
      AND id IN (
        SELECT id FROM revisions
        WHERE page_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT -1 OFFSET ?
      )
    `),
    getAppMeta: db.prepare<[string], { value: string }>(
      'SELECT value FROM app_meta WHERE key = ? LIMIT 1'
    ),
    setAppMeta: db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ),
    deleteAppMeta: db.prepare('DELETE FROM app_meta WHERE key = ?'),
    search: db.prepare<[string, number], SearchResult>(`
      SELECT p.slug, p.title, p.namespace,
             snippet(pages_fts, 1, '<mark>', '</mark>', '…', 20) AS snippet, rank
      FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid
      WHERE pages_fts MATCH ? AND ${SEARCHABLE_NAMESPACE_SQL} ORDER BY rank LIMIT ?
    `),
    searchSuggestions: db.prepare<[string, number], SearchSuggestion>(`
      SELECT p.slug, p.title
      FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid
      WHERE pages_fts MATCH ? AND ${SEARCHABLE_NAMESPACE_SQL} ORDER BY rank LIMIT ?
    `),
    recentPages: db.prepare<[number], Page>(
      "SELECT * FROM pages WHERE slug != 'home' ORDER BY updated_at DESC LIMIT ?"
    ),
    getAllSlugs: db.prepare<[], { slug: string }>('SELECT slug FROM pages'),
    findPagesReferencingUpload: db.prepare<[string, string], PageSummary>(`
      SELECT id, slug, title, namespace, created_at, updated_at FROM pages
      WHERE content LIKE ? OR content LIKE ?
      ORDER BY title ASC
    `),
    bulkReplaceContent: db.prepare('UPDATE pages SET content = replace(content, ?, ?)'),
    getUserByName: db.prepare<[string], User>('SELECT * FROM users WHERE username = ? LIMIT 1'),
    getUserById: db.prepare<[number], User>('SELECT * FROM users WHERE id = ? LIMIT 1'),
    createUser: db.prepare(
      'INSERT INTO users (username, password_hash, must_change_pw, is_admin) VALUES (?, ?, ?, ?)'
    ),
    updatePassword: db.prepare(
      'UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?'
    ),
    createSession: db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
    ),
    getSession: db.prepare<[string], { user_id: number }>(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')"
    ),
    deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
    deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    deleteUserSessionsExcept: db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?'),
    pruneExpiredSessions: db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
    insertUpload: db.prepare(
      'INSERT OR IGNORE INTO uploads (filename, original_name, size, mime_type, content_hash) VALUES (?, ?, ?, ?, ?)'
    ),
    getAllUploads: db.prepare<[], Upload>('SELECT * FROM uploads ORDER BY created_at DESC'),
    getUploadByName: db.prepare<[string], Upload>(
      'SELECT * FROM uploads WHERE filename = ? LIMIT 1'
    ),
    getUploadByContentHash: db.prepare<[string], Upload>(
      'SELECT * FROM uploads WHERE content_hash = ? LIMIT 1'
    ),
    updateUploadContentHash: db.prepare('UPDATE uploads SET content_hash = ? WHERE filename = ?'),
    renameUpload: db.prepare('UPDATE uploads SET filename = ? WHERE filename = ?'),
    deleteUpload: db.prepare('DELETE FROM uploads WHERE filename = ?'),
    listUsers: db.prepare<
      [],
      Pick<User, 'id' | 'username' | 'must_change_pw' | 'is_admin' | 'created_at'>
    >('SELECT id, username, must_change_pw, is_admin, created_at FROM users ORDER BY username ASC'),
    getRateLimit: db.prepare<[string], { count: number; reset_at: number }>(
      'SELECT count, reset_at FROM rate_limits WHERE key = ? LIMIT 1'
    ),
    upsertRateLimitWindow: db.prepare<[string, number]>(`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at
    `),
    incrementRateLimit: db.prepare<[string]>(
      'UPDATE rate_limits SET count = count + 1 WHERE key = ?'
    ),
    deleteExpiredRateLimits: db.prepare<[number]>('DELETE FROM rate_limits WHERE reset_at <= ?'),
    deleteAllRateLimits: db.prepare('DELETE FROM rate_limits'),
    getRateLimitResetAt: db.prepare<[string], { reset_at: number }>(
      'SELECT reset_at FROM rate_limits WHERE key = ? LIMIT 1'
    ),
    touchSession: db.prepare<[string]>(
      "UPDATE sessions SET expires_at = datetime('now', '+30 days') WHERE id = ? AND expires_at > datetime('now')"
    )
  }
}

export type Statements = ReturnType<typeof buildStatements>
