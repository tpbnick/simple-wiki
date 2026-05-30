import { json, error } from '@sveltejs/kit'
import { getUploadByContentHash, recordUpload } from '$lib/db/index.js'
import {
  resolveUploadPath,
  storeUploadBuffer,
  uploadContentHash,
  uploadPublicUrl,
  validateUpload,
  MAX_UPLOAD_BYTES
} from '$lib/uploads.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import type { RequestHandler } from './$types'

const UPLOAD_LIMIT = 30
const UPLOAD_WINDOW_MS = 15 * 60 * 1000

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  enforceAuthenticatedWriteRateLimit(
    locals,
    getClientAddress,
    'upload',
    UPLOAD_LIMIT,
    UPLOAD_WINDOW_MS
  )

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) error(400, 'No file provided')
  if (file.size > MAX_UPLOAD_BYTES) error(413, 'File too large (max 50 MB)')

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validateUpload(buffer, file.name, file.type)
  if (!validation.ok) error(415, validation.error ?? 'File type not allowed')

  const contentHash = uploadContentHash(buffer)
  const existing = getUploadByContentHash(contentHash)
  if (existing) {
    const existingPath = resolveUploadPath(existing.filename)
    if (existingPath) {
      if (!existsSync(existingPath)) {
        writeFileSync(existingPath, buffer)
      }
      return json({
        filename: existing.filename,
        url: uploadPublicUrl(existing.filename),
        mimeType: existing.mime_type,
        size: existing.size,
        reused: true
      })
    }
  }

  const { filename, reusedOnDisk } = storeUploadBuffer(file.name, buffer)
  const mimeType = validation.mimeType ?? file.type

  try {
    const upload = recordUpload(filename, file.name, buffer.length, mimeType, contentHash)
    return json({
      filename: upload.filename,
      url: uploadPublicUrl(upload.filename),
      mimeType: upload.mime_type,
      size: upload.size,
      reused: reusedOnDisk
    })
  } catch (recordError) {
    if (!reusedOnDisk) {
      const storedPath = resolveUploadPath(filename)
      if (storedPath && existsSync(storedPath)) {
        unlinkSync(storedPath)
      }
    }
    throw recordError
  }
}
