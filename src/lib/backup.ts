import Database from 'better-sqlite3'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { zipSync, unzipSync } from 'fflate'
import { getAppVersion, getWikiName } from '$lib/wiki-identity.js'
import {
  openDatabase,
  resetDatabaseConnection,
  resolveDatabasePath,
  applyExtensionSchemas
} from '$lib/db/connection.js'
import { getExtensions } from '$lib/extensions/server.js'
import { uploadsDirectory } from '$lib/uploads.js'
import {
  validateZipArchiveLimits,
  validateUnzippedEntrySizes,
  ZipSafetyError
} from '$lib/zip-safety.js'
import { getAllPages } from '$lib/db/index.js'
import type { Page } from '$lib/db/types.js'
import { invalidatePageSlugCache } from '$lib/db/slug-cache.js'
import {
  beginDatabaseImport,
  endDatabaseImport,
  isDatabaseSwapInProgress
} from '$lib/db/swap-lock.js'
import { runOnDatabaseReset } from '$lib/extensions/server.js'

export const BACKUP_MANIFEST_FILE = 'manifest.txt'
export const BACKUP_DATABASE_FILE = 'wiki.db'
export const BACKUP_UPLOADS_PREFIX = 'uploads/'
export const BACKUP_MARKDOWN_PREFIX = 'markdown/'
export const BACKUP_FORMAT_VERSION = 1
export const MAX_BACKUP_BYTES = 500 * 1024 * 1024
export const MAX_BACKUP_ENTRIES = 10_000
export const MAX_BACKUP_UNCOMPRESSED_BYTES = MAX_BACKUP_BYTES

export interface BackupManifest {
  wikiName: string
  wikiVersion: string
  backupFormat: number
  createdAt: string
  includesUploads: boolean
  includesMarkdown: boolean
}

export interface BackupOptions {
  includeUploads?: boolean
  includeMarkdown?: boolean
}

export interface ImportBackupOptions {
  restoreUploads?: boolean
}

export interface ImportBackupResult {
  manifest: BackupManifest
  warnings: string[]
}

export class BackupError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'BackupError'
  }
}

/** Serializes a backup manifest to the standard text format. */
export function formatBackupManifest(manifest: BackupManifest): string {
  const lines = [
    '# Wiki backup manifest',
    `wiki_name=${manifest.wikiName}`,
    `wiki_version=${manifest.wikiVersion}`,
    `backup_format=${manifest.backupFormat}`,
    `created_at=${manifest.createdAt}`,
    `includes_uploads=${manifest.includesUploads ? 'true' : 'false'}`,
    `includes_markdown=${manifest.includesMarkdown ? 'true' : 'false'}`
  ]
  if (manifest.includesMarkdown) {
    lines.push(
      '# markdown/ includes article and help pages only; template namespace pages are only in wiki.db'
    )
  }
  return lines.join('\n')
}

/** Parses a backup manifest from text. */
export function parseBackupManifest(text: string): BackupManifest {
  const values = new Map<string, string>()

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    values.set(trimmed.slice(0, index), trimmed.slice(index + 1))
  }

  const wikiName = values.get('wiki_name')?.trim()
  const wikiVersion = values.get('wiki_version')?.trim()
  const createdAt = values.get('created_at')?.trim()
  const backupFormat = Number(values.get('backup_format'))
  const includesUploadsRaw = values.get('includes_uploads')?.trim().toLowerCase()
  const includesMarkdownRaw = values.get('includes_markdown')?.trim().toLowerCase()

  if (!wikiName) throw new BackupError('Manifest is missing wiki_name')
  if (!wikiVersion) throw new BackupError('Manifest is missing wiki_version')
  if (!createdAt) throw new BackupError('Manifest is missing created_at')
  if (!Number.isInteger(backupFormat) || backupFormat < 1) {
    throw new BackupError('Manifest has an invalid backup_format')
  }

  return {
    wikiName,
    wikiVersion,
    backupFormat,
    createdAt,
    includesUploads: includesUploadsRaw === 'true',
    includesMarkdown: includesMarkdownRaw === 'true'
  }
}

function createManifest(options: {
  includeUploads: boolean
  includeMarkdown: boolean
}): BackupManifest {
  return {
    wikiName: getWikiName(),
    wikiVersion: getAppVersion(),
    backupFormat: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    includesUploads: options.includeUploads,
    includesMarkdown: options.includeMarkdown
  }
}

function yamlScalar(value: string): string {
  if (/[:#\n"']/.test(value) || value.trim() !== value || value === '' || /^[\d-]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
  }
  return value
}

function markdownZipPath(namespace: string, slug: string): string {
  if (!/^[a-z0-9_-]+$/i.test(slug) || !/^[a-z0-9_-]+$/i.test(namespace)) {
    throw new BackupError(`Cannot export page with unsafe markdown path: ${namespace}/${slug}`)
  }
  return `${BACKUP_MARKDOWN_PREFIX}${namespace}/${slug}.md`
}

/** Serializes a wiki page as markdown with YAML frontmatter. */
export function serializePageAsMarkdown(page: Page): string {
  const lines = [
    '---',
    `title: ${yamlScalar(page.title)}`,
    `slug: ${page.slug}`,
    `namespace: ${page.namespace}`,
    `created_at: ${page.created_at}`,
    `updated_at: ${page.updated_at}`,
    '---',
    '',
    page.content
  ]
  return lines.join('\n')
}

function collectMarkdownEntries(): Record<string, Uint8Array> {
  const pages = getAllPages()
  const entries: Record<string, Uint8Array> = {}
  const encoder = new TextEncoder()

  for (const page of pages) {
    if (page.namespace === 'template') continue
    entries[markdownZipPath(page.namespace, page.slug)] = encoder.encode(
      serializePageAsMarkdown(page)
    )
  }

  return entries
}

async function snapshotDatabaseToFile(destinationPath: string): Promise<void> {
  const { db } = openDatabase()
  db.pragma('wal_checkpoint(TRUNCATE)')
  await db.backup(destinationPath)
}

function collectUploadEntries(): Record<string, Uint8Array> {
  const directory = uploadsDirectory()
  const entries: Record<string, Uint8Array> = {}

  if (!existsSync(directory)) return entries

  for (const name of readdirSync(directory)) {
    const filePath = join(directory, name)
    if (!statSync(filePath).isFile()) continue
    entries[`${BACKUP_UPLOADS_PREFIX}${name}`] = readFileSync(filePath)
  }

  return entries
}

function safeUploadFilename(zipPath: string): string | null {
  if (!zipPath.startsWith(BACKUP_UPLOADS_PREFIX)) return null
  const filename = zipPath.slice(BACKUP_UPLOADS_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null
  }
  return filename
}

function listUploadEntries(entries: Record<string, Uint8Array>): Array<[string, Uint8Array]> {
  return Object.entries(entries).flatMap(([path, data]) => {
    const filename = safeUploadFilename(path)
    return filename ? [[filename, data] as [string, Uint8Array]] : []
  })
}

function validateSqliteFile(path: string): void {
  const db = new Database(path, { readonly: true, fileMustExist: true })
  try {
    const row = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string }
    if (row?.integrity_check !== 'ok') {
      throw new BackupError('Backup database failed integrity check')
    }
  } finally {
    db.close()
  }
}

function removeSidecarFiles(dbPath: string): void {
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${dbPath}${suffix}`
    if (existsSync(sidecar)) unlinkSync(sidecar)
  }
}

/** Move or copy a file into place; rename fails with EXDEV across mount points (e.g. /tmp -> /data). */
function replacePathSync(source: string, destination: string): void {
  try {
    renameSync(source, destination)
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : ''
    if (code !== 'EXDEV') throw error
    copyFileSync(source, destination)
    unlinkSync(source)
  }
}

function restoreUploads(uploadEntries: Array<[string, Uint8Array]>): void {
  if (uploadEntries.length === 0) return

  const liveDir = uploadsDirectory()
  const preImportDir = `${liveDir}.pre-import-${Date.now()}`

  if (existsSync(liveDir)) {
    renameSync(liveDir, preImportDir)
  }

  mkdirSync(liveDir, { recursive: true })

  try {
    for (const [filename, data] of uploadEntries) {
      writeFileSync(join(liveDir, filename), data)
    }
  } catch (error) {
    rmSync(liveDir, { recursive: true, force: true })
    if (existsSync(preImportDir)) {
      renameSync(preImportDir, liveDir)
    }
    throw error
  }

  if (existsSync(preImportDir)) {
    rmSync(preImportDir, { recursive: true, force: true })
  }
}

function buildImportWarnings(
  manifest: BackupManifest,
  options: ImportBackupOptions,
  uploadEntries: Array<[string, Uint8Array]>
): string[] {
  const warnings: string[] = []
  const currentVersion = getAppVersion()

  if (manifest.wikiVersion !== currentVersion) {
    warnings.push(
      `Backup was created with app version ${manifest.wikiVersion}; current version is ${currentVersion}. Core and extension migrations run automatically on restore.`
    )
  }

  if (manifest.includesUploads && options.restoreUploads !== true) {
    warnings.push('Backup includes uploaded files, but they were not restored.')
  } else if (options.restoreUploads === true && uploadEntries.length === 0) {
    warnings.push(
      'Restore uploads was enabled, but the backup zip did not contain any upload files.'
    )
  }

  return warnings
}

function unzipBackupArchive(zipBytes: Uint8Array): Record<string, Uint8Array> {
  const limits = {
    maxEntries: MAX_BACKUP_ENTRIES,
    maxTotalUncompressed: MAX_BACKUP_UNCOMPRESSED_BYTES,
    maxEntryUncompressed: MAX_BACKUP_UNCOMPRESSED_BYTES
  }

  try {
    validateZipArchiveLimits(zipBytes, limits)
    const entries = unzipSync(zipBytes)
    validateUnzippedEntrySizes(entries, limits)
    return entries
  } catch (error) {
    if (error instanceof ZipSafetyError) {
      throw new BackupError(error.message)
    }
    throw new BackupError('Could not read backup zip file')
  }
}

/** Creates a zip backup containing wiki.db, manifest.txt, and optional uploads/markdown. */
export async function createBackupArchive(options: BackupOptions = {}): Promise<Uint8Array> {
  if (isDatabaseSwapInProgress()) {
    throw new BackupError('Cannot create a backup while a restore is in progress')
  }

  const includeUploads = options.includeUploads === true
  const includeMarkdown = options.includeMarkdown === true
  const tempDir = mkdtempSync(join(tmpdir(), 'wiki-backup-'))
  const snapshotPath = join(tempDir, BACKUP_DATABASE_FILE)

  try {
    await snapshotDatabaseToFile(snapshotPath)
    const manifest = createManifest({ includeUploads, includeMarkdown })
    const manifestBytes = new TextEncoder().encode(formatBackupManifest(manifest))

    const zipEntries: Record<string, Uint8Array> = {
      [BACKUP_MANIFEST_FILE]: manifestBytes,
      [BACKUP_DATABASE_FILE]: readFileSync(snapshotPath)
    }

    if (includeUploads) {
      Object.assign(zipEntries, collectUploadEntries())
    }

    if (includeMarkdown) {
      Object.assign(zipEntries, collectMarkdownEntries())
    }

    return zipSync(zipEntries)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

/** Suggested filename for a downloaded backup archive. */
export function backupDownloadFilename(date = new Date()): string {
  const stamp = date.toISOString().replaceAll(':', '-').replace(/\..+$/, '')
  const slug =
    getWikiName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'wiki'
  return `${slug}-backup-${stamp}.zip`
}

/** Replaces the live database with wiki.db from a backup zip. */
export function importBackupArchive(
  zipBytes: Uint8Array,
  options: ImportBackupOptions = {}
): ImportBackupResult {
  if (zipBytes.byteLength > MAX_BACKUP_BYTES) {
    throw new BackupError(`Backup file exceeds ${MAX_BACKUP_BYTES} bytes`)
  }

  beginDatabaseImport()

  try {
    const entries = unzipBackupArchive(zipBytes)

    const manifestBytes = entries[BACKUP_MANIFEST_FILE]
    const databaseBytes = entries[BACKUP_DATABASE_FILE]
    if (!manifestBytes) throw new BackupError('Backup zip is missing manifest.txt')
    if (!databaseBytes?.length) throw new BackupError('Backup zip is missing wiki.db')

    const manifest = parseBackupManifest(new TextDecoder().decode(manifestBytes))
    const uploadEntries = options.restoreUploads === true ? listUploadEntries(entries) : []
    const warnings = buildImportWarnings(manifest, options, uploadEntries)

    const livePath = resolveDatabasePath()
    const dbDir = dirname(livePath)
    mkdirSync(dbDir, { recursive: true })
    const tempDir = mkdtempSync(join(dbDir, '.wiki-import-'))
    const extractedDbPath = join(tempDir, BACKUP_DATABASE_FILE)
    const stagingPath = join(tempDir, `${BACKUP_DATABASE_FILE}.staging`)

    try {
      writeFileSync(extractedDbPath, databaseBytes)
      validateSqliteFile(extractedDbPath)
      copyFileSync(extractedDbPath, stagingPath)
      removeSidecarFiles(stagingPath)

      resetDatabaseConnection()
      runOnDatabaseReset()

      const preImportPath = `${livePath}.pre-import-${Date.now()}`

      if (existsSync(livePath)) {
        replacePathSync(livePath, preImportPath)
      }
      removeSidecarFiles(livePath)

      let importSucceeded = false
      try {
        replacePathSync(stagingPath, livePath)
        removeSidecarFiles(livePath)
        openDatabase({ duringImport: true })
        applyExtensionSchemas(getExtensions())
        invalidatePageSlugCache()
        runOnDatabaseReset()

        if (uploadEntries.length > 0) {
          restoreUploads(uploadEntries)
        }

        importSucceeded = true
      } catch (error) {
        resetDatabaseConnection()
        runOnDatabaseReset()

        if (existsSync(livePath)) {
          unlinkSync(livePath)
          removeSidecarFiles(livePath)
        }

        if (existsSync(preImportPath)) {
          try {
            replacePathSync(preImportPath, livePath)
            removeSidecarFiles(livePath)
          } catch (rollbackError) {
            throw new BackupError(
              `Database import failed and could not restore the previous database at ${preImportPath}. ` +
                'Do not delete that file until the wiki is recovered.',
              { cause: rollbackError }
            )
          }
        }

        openDatabase({ duringImport: true })
        invalidatePageSlugCache()
        runOnDatabaseReset()
        throw error
      } finally {
        if (importSucceeded && existsSync(preImportPath)) {
          unlinkSync(preImportPath)
        }
      }

      return { manifest, warnings }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  } finally {
    endDatabaseImport()
  }
}
