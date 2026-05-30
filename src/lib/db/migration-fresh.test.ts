import { describe, expect, it } from 'vitest'
import { getDatabase } from '$lib/db/connection.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-fresh-migrate-')

describe('fresh database migrations', () => {
  it('creates upload hash index and FTS triggers on first open', () => {
    const db = getDatabase()

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='uploads'")
      .all() as Array<{ name: string }>
    expect(indexes.some((index) => index.name === 'uploads_content_hash')).toBe(true)

    const triggers = db
      .prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'pages_fts_%'")
      .all() as Array<{ name: string }>
    expect(triggers.map((trigger) => trigger.name).sort()).toEqual([
      'pages_fts_ad',
      'pages_fts_ai',
      'pages_fts_au'
    ])

    const revisionIndexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='revisions'")
      .all() as Array<{ name: string }>
    expect(revisionIndexes.some((index) => index.name === 'idx_revisions_page_id')).toBe(true)
  })
})
