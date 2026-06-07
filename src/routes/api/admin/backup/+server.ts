import { error, json } from '@sveltejs/kit'
import {
  BackupError,
  backupDownloadFilename,
  createBackupArchive,
  importBackupArchive,
  MAX_BACKUP_BYTES
} from '$lib/backup.js'
import { requireAdmin } from '$lib/admin-access.js'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '$lib/rate-limit.js'
import type { RequestHandler } from './$types'

const BACKUP_RESTORE_LIMIT = 5
const BACKUP_RESTORE_WINDOW_MS = 60 * 60 * 1000
const BACKUP_DOWNLOAD_LIMIT = 20
const BACKUP_DOWNLOAD_WINDOW_MS = 60 * 60 * 1000

export const GET: RequestHandler = async ({ locals, url, getClientAddress }) => {
  requireAdmin(locals)

  const rateKey = `backup-download:${getClientAddress()}:${locals.user!.id}`
  if (!checkRateLimit(rateKey, BACKUP_DOWNLOAD_LIMIT, BACKUP_DOWNLOAD_WINDOW_MS)) {
    const retryAfter = rateLimitRetryAfterSeconds(rateKey)
    error(429, `Too many backup downloads. Try again in ${retryAfter || 60} seconds.`)
  }

  const includeUploads = url.searchParams.get('includeUploads') === '1'
  const includeMarkdown = url.searchParams.get('includeMarkdown') === '1'
  const archive = await createBackupArchive({ includeUploads, includeMarkdown })
  const filename = backupDownloadFilename()

  return new Response(Buffer.from(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(archive.byteLength)
    }
  })
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  requireAdmin(locals)

  const rateKey = `backup-restore:${getClientAddress()}:${locals.user!.id}`
  if (!checkRateLimit(rateKey, BACKUP_RESTORE_LIMIT, BACKUP_RESTORE_WINDOW_MS)) {
    const retryAfter = rateLimitRetryAfterSeconds(rateKey)
    error(429, `Too many restore attempts. Try again in ${retryAfter || 60} seconds.`)
  }

  const formData = await request.formData()
  const file = formData.get('backup')
  const overwriteDatabase = formData.get('overwriteDatabase') === 'on'
  const restoreUploads = formData.get('restoreUploads') === 'on'

  if (!(file instanceof File)) {
    error(400, 'Backup file is required')
  }

  if (!overwriteDatabase) {
    error(
      400,
      'Confirm fully overwrite existing database before importing — this replaces the entire live wiki database.'
    )
  }

  if (file.size > MAX_BACKUP_BYTES) {
    error(400, `Backup file exceeds ${MAX_BACKUP_BYTES} bytes`)
  }

  const zipBytes = new Uint8Array(await file.arrayBuffer())

  try {
    const { manifest, warnings } = importBackupArchive(zipBytes, {
      overwriteDatabase: true,
      restoreUploads
    })
    return json({
      ok: true,
      manifest: {
        wikiName: manifest.wikiName,
        wikiVersion: manifest.wikiVersion,
        backupFormat: manifest.backupFormat,
        createdAt: manifest.createdAt,
        includesUploads: manifest.includesUploads,
        includesMarkdown: manifest.includesMarkdown
      },
      warnings
    })
  } catch (importError) {
    if (importError instanceof BackupError) {
      error(400, importError.message)
    }
    throw importError
  }
}
