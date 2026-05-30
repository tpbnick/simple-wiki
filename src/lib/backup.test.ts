import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import BetterSqlite3 from 'better-sqlite3'
import { zipSync, unzipSync } from 'fflate'
import { beginDatabaseImport, endDatabaseImport } from '$lib/db/swap-lock.js'
import { describe, expect, it } from 'vitest'
import {
  BackupError,
  BACKUP_DATABASE_FILE,
  BACKUP_MANIFEST_FILE,
  createBackupArchive,
  formatBackupManifest,
  importBackupArchive,
  parseBackupManifest,
  serializePageAsMarkdown
} from '$lib/backup.js'
import { getPage, savePage } from '$lib/db/index.js'
import { getDatabase } from '$lib/db/connection.js'
import { SCHEMA } from '$lib/db/schema.js'
import { loadExtensions } from '$lib/extensions/server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'
import { uploadsDirectory } from '$lib/uploads.js'

installTempWikiEnv('wiki-backup-test-', { wikiName: 'Test Wiki' })

describe('backup manifest', () => {
  it('round-trips manifest fields', () => {
    const manifest = {
      wikiName: 'My Wiki',
      wikiVersion: '0.1.0',
      backupFormat: 1,
      createdAt: '2026-05-28T12:00:00.000Z',
      includesUploads: true,
      includesMarkdown: true
    }

    const parsed = parseBackupManifest(formatBackupManifest(manifest))
    expect(parsed).toEqual(manifest)
  })

  it('defaults includes_uploads to false when omitted', () => {
    const parsed = parseBackupManifest([
      'wiki_name=Wiki',
      'wiki_version=0.1.0',
      'backup_format=1',
      'created_at=2026-05-28T12:00:00.000Z'
    ].join('\n'))

    expect(parsed.includesUploads).toBe(false)
    expect(parsed.includesMarkdown).toBe(false)
  })

  it('rejects missing manifest fields', () => {
    expect(() => parseBackupManifest('wiki_name=Wiki')).toThrow(BackupError)
  })
})

describe('backup archive', () => {
  it('exports and imports a database snapshot', async () => {
    savePage('backup-page', 'Backup Page', 'original content', 'article', 'create')

    const archive = await createBackupArchive()
    savePage('backup-page', 'Backup Page', 'changed content', 'article', 'edit')
    expect(getPage('backup-page')?.content).toBe('changed content')

    const { manifest } = importBackupArchive(archive)
    expect(manifest.wikiName).toBe('Test Wiki')
    expect(getPage('backup-page')?.content).toBe('original content')
  })

  it('exports markdown files when requested', async () => {
    savePage('md-page', 'MD Page', '# Hello\n\nWorld', 'article', 'create')

    const archive = await createBackupArchive({ includeMarkdown: true })
    const entries = unzipSync(archive)
    const mdPath = 'markdown/article/md-page.md'

    expect(entries[mdPath]).toBeDefined()
    const text = new TextDecoder().decode(entries[mdPath])
    expect(text).toContain('# Hello')
    expect(text).toContain('slug: md-page')
    expect(text).toContain('title: MD Page')
  })

  it('includes markdown flag in manifest when requested', async () => {
    const archive = await createBackupArchive({ includeMarkdown: true })
    const entries = unzipSync(archive)
    const manifestText = new TextDecoder().decode(entries['manifest.txt'])
    const manifest = parseBackupManifest(manifestText)
    expect(manifest.includesMarkdown).toBe(true)
    expect(manifestText).toContain('template namespace pages are only in wiki.db')
  })

  it('serializes page frontmatter safely', () => {
    const markdown = serializePageAsMarkdown({
      id: 1,
      slug: 'quoted',
      title: 'Title: with "quotes"',
      content: 'Body',
      namespace: 'article',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z'
    })

    expect(markdown).toContain('title: "Title: with \\"quotes\\""')
    expect(markdown).toContain('Body')
  })

  it('excludes template pages from markdown export', async () => {
    savePage('tmpl-page', 'Template Page', 'template body', 'template', 'create')

    const archive = await createBackupArchive({ includeMarkdown: true })
    const entries = unzipSync(archive)

    expect(entries['markdown/template/tmpl-page.md']).toBeUndefined()
  })

  it('rejects backup export during restore', async () => {
    beginDatabaseImport()
    try {
      await expect(createBackupArchive()).rejects.toThrow(BackupError)
      await expect(createBackupArchive()).rejects.toThrow(/restore is in progress/)
    } finally {
      endDatabaseImport()
    }
  })

  it('exports and restores uploaded files when requested', async () => {
    writeFileSync(join(uploadsDirectory(), 'photo.png'), 'png-bytes')

    const archive = await createBackupArchive({ includeUploads: true })
    writeFileSync(join(uploadsDirectory(), 'photo.png'), 'changed-bytes')

    const { manifest } = importBackupArchive(archive, { restoreUploads: true })
    expect(manifest.includesUploads).toBe(true)
    expect(readFileSync(join(uploadsDirectory(), 'photo.png'), 'utf8')).toBe('png-bytes')
  })

  it('warns when uploads are not restored', async () => {
    writeFileSync(join(uploadsDirectory(), 'photo.png'), 'png-bytes')
    const archive = await createBackupArchive({ includeUploads: true })

    const { warnings } = importBackupArchive(archive)
    expect(warnings.some((warning) => warning.includes('were not restored'))).toBe(true)
  })

  it('does not restore uploads unless requested', async () => {
    writeFileSync(join(uploadsDirectory(), 'photo.png'), 'png-bytes')

    const archive = await createBackupArchive({ includeUploads: true })
    writeFileSync(join(uploadsDirectory(), 'photo.png'), 'changed-bytes')

    importBackupArchive(archive)
    expect(readFileSync(join(uploadsDirectory(), 'photo.png'), 'utf8')).toBe('changed-bytes')
  })

  it('rejects invalid zip files', () => {
    expect(() => importBackupArchive(new Uint8Array([1, 2, 3]))).toThrow(BackupError)
  })

  it('applies extension schemas when the backup database lacks extension tables', () => {
    loadExtensions()

    const tempDir = mkdtempSync(join(tmpdir(), 'wiki-backup-core-only-'))
    const dbPath = join(tempDir, BACKUP_DATABASE_FILE)

    try {
      const db = new BetterSqlite3(dbPath)
      db.exec(SCHEMA)
      db.close()

      const manifest = formatBackupManifest({
        wikiName: 'Test Wiki',
        wikiVersion: '0.1.0',
        backupFormat: 1,
        createdAt: '2026-05-28T12:00:00.000Z',
        includesUploads: false,
        includesMarkdown: false
      })

      const archive = zipSync({
        [BACKUP_MANIFEST_FILE]: new TextEncoder().encode(manifest),
        [BACKUP_DATABASE_FILE]: readFileSync(dbPath)
      })

      importBackupArchive(archive)

      const liveDb = getDatabase()
      const table = liveDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='family_trees'")
        .get() as { name: string } | undefined

      expect(table?.name).toBe('family_trees')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})