import { createHash } from 'crypto'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  writeSync,
  readFileSync
} from 'fs'
import { resolve, extname, join, basename } from 'path'

/** Maximum upload size in bytes (50 MB). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** Maps file extensions to MIME types for served uploads. */
export const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
}

/** MIME types accepted by the upload endpoint. */
export const ALLOWED_UPLOAD_MIME_TYPES = new Set(Object.values(EXTENSION_MIME_TYPES))

const MAGIC_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/zip': [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06]
  ],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/mpeg': [
    [0xff, 0xfb],
    [0x49, 0x44, 0x33]
  ],
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]]
}

export interface UploadValidationResult {
  ok: boolean
  mimeType?: string
  error?: string
}

let cachedUploadsDirectory: string | null = null

/** Resolves UPLOADS_DIR, defaulting to /uploads in production Docker when that path exists. */
export function defaultUploadsDirectoryPath(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR
  if (process.env.NODE_ENV === 'production' && existsSync('/uploads')) return '/uploads'
  return './uploads'
}

/**
 * Returns the absolute path to the uploads directory, creating it if needed.
 */
export function uploadsDirectory(): string {
  if (cachedUploadsDirectory) return cachedUploadsDirectory
  const directory = resolve(defaultUploadsDirectoryPath())
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
  cachedUploadsDirectory = directory
  return directory
}

/** Clears cached uploads directory resolution. Intended for tests. */
export function resetUploadsDirectoryForTests(nextDir?: string): void {
  cachedUploadsDirectory = nextDir ?? null
}

/**
 * Resolves a filename within the uploads directory, or returns null if it escapes.
 * @param filename - Stored upload filename.
 */
export function resolveUploadPath(filename: string): string | null {
  const directory = uploadsDirectory()
  const filePath = resolve(directory, filename)
  const prefix = directory.endsWith('/') ? directory : `${directory}/`
  if (filePath !== directory && !filePath.startsWith(prefix)) return null
  return filePath
}

/**
 * Keeps the client filename, stripping only path segments and unsafe values.
 * @param name - Original filename from the upload.
 */
export function normalizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const base = trimmed.includes('/') || trimmed.includes('\\') ? basename(trimmed) : trimmed
  if (!base || base === '.' || base === '..' || base.includes('\0')) {
    return 'file'
  }
  return base
}

/** SHA-256 hex digest of upload bytes. */
export function uploadContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** Public URL for a stored upload filename. */
export function uploadPublicUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`
}

/**
 * Returns the MIME type for a file extension, or `application/octet-stream`.
 * @param extension - Extension including the leading dot, e.g. `.png`.
 */
export function mimeTypeForExtension(extension: string): string {
  return EXTENSION_MIME_TYPES[extension.toLowerCase()] ?? 'application/octet-stream'
}

export function buffersEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.equals(b)
}

/** Writes a file only when it does not already exist. Returns whether the file was created. */
export function writeUploadFileExclusive(filePath: string, buffer: Buffer): boolean {
  try {
    const fd = openSync(filePath, 'wx')
    try {
      writeSync(fd, buffer)
    } finally {
      closeSync(fd)
    }
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'EEXIST') return false
    throw error
  }
}

/** Creates a readable stream for a stored upload file. */
export function createUploadReadStream(filename: string) {
  const filePath = resolveUploadPath(filename)
  if (!filePath) return null
  return createReadStream(filePath)
}

export interface ResolvedUploadFilename {
  filename: string
  reusedOnDisk: boolean
}

function pickUploadFilename(
  originalName: string,
  buffer: Buffer,
  options: { writeExclusive: boolean }
): ResolvedUploadFilename {
  const directory = uploadsDirectory()
  const desired = normalizeUploadFilename(originalName)
  const extension = extname(desired)
  const rawBase = extension ? desired.slice(0, desired.length - extension.length) : desired
  const stem = rawBase || 'file'

  let counter = 1
  while (true) {
    const filename = counter === 1 ? desired : `${stem}-${counter}${extension}`
    const filePath = join(directory, filename)

    if (options.writeExclusive) {
      if (writeUploadFileExclusive(filePath, buffer)) {
        return { filename, reusedOnDisk: false }
      }
    } else if (!existsSync(filePath)) {
      return { filename, reusedOnDisk: false }
    }

    const existing = readFileSync(filePath)
    if (buffersEqual(existing, buffer)) {
      return { filename, reusedOnDisk: true }
    }

    counter++
  }
}

/**
 * Stores upload bytes on disk, reusing an existing file when bytes match.
 * Uses exclusive create to avoid concurrent upload races.
 */
export function storeUploadBuffer(originalName: string, buffer: Buffer): ResolvedUploadFilename {
  return pickUploadFilename(originalName, buffer, { writeExclusive: true })
}

/**
 * Picks a stored filename for new content.
 * Adds `-2`, `-3`, … only when the same name already holds different bytes.
 */
export function resolveAvailableFilename(
  originalName: string,
  buffer: Buffer
): ResolvedUploadFilename {
  return pickUploadFilename(originalName, buffer, { writeExclusive: false })
}

/**
 * Returns true when the browser-reported MIME type is allowed for upload.
 * @param mimeType - MIME type from the uploaded file.
 */
export function isAllowedUploadType(mimeType: string): boolean {
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)
}

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false
  return signature.every((byte, index) => buffer[index] === byte)
}

function hasRiffHeader(buffer: Buffer): boolean {
  return matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46])
}

function riffFormType(buffer: Buffer): string | null {
  if (buffer.length < 12 || !hasRiffHeader(buffer)) return null
  return buffer.subarray(8, 12).toString('ascii')
}

function isValidUtf8Text(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    return true
  } catch {
    return false
  }
}

function isLikelyJson(buffer: Buffer): boolean {
  if (!isValidUtf8Text(buffer)) return false
  const text = buffer.toString('utf8').trimStart()
  return text.startsWith('{') || text.startsWith('[')
}

function isLikelyMp4(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  return buffer.subarray(4, 8).toString('ascii') === 'ftyp'
}

function detectMimeType(buffer: Buffer, extension: string): string | null {
  const riffType = riffFormType(buffer)
  if (riffType === 'WAVE') return 'audio/wav'
  if (riffType === 'WEBP') return 'image/webp'

  for (const [mimeType, signatures] of Object.entries(MAGIC_SIGNATURES)) {
    if (signatures.some((signature) => matchesSignature(buffer, signature))) {
      return mimeType
    }
  }

  const extensionMime = mimeTypeForExtension(extension)
  if (extensionMime === 'text/plain' || extensionMime === 'text/csv') {
    return isValidUtf8Text(buffer) ? extensionMime : null
  }
  if (extensionMime === 'application/json') {
    return isLikelyJson(buffer) ? extensionMime : null
  }
  if (extensionMime === 'video/mp4') {
    return isLikelyMp4(buffer) ? extensionMime : null
  }

  return null
}

/**
 * Validates an upload using extension and magic-byte checks.
 * @param buffer - File contents.
 * @param filename - Original filename from the client.
 * @param reportedMime - MIME type reported by the browser.
 */
export function validateUpload(
  buffer: Buffer,
  filename: string,
  reportedMime: string
): UploadValidationResult {
  const extension = extname(filename).toLowerCase()
  const extensionMime = mimeTypeForExtension(extension)

  if (!extension || !EXTENSION_MIME_TYPES[extension]) {
    return { ok: false, error: `File extension not allowed: ${extension || '(none)'}` }
  }

  if (!isAllowedUploadType(reportedMime) && reportedMime !== extensionMime) {
    return { ok: false, error: `File type not allowed: ${reportedMime}` }
  }

  const detectedMime = detectMimeType(buffer, extension)
  if (!detectedMime) {
    return { ok: false, error: 'Could not verify file contents' }
  }

  if (
    detectedMime !== extensionMime &&
    !(extensionMime.startsWith('text/') && detectedMime.startsWith('text/'))
  ) {
    if (extensionMime.startsWith('audio/') && detectedMime.startsWith('audio/')) {
      // Accept common audio signature mismatches across audio formats.
    } else {
      return { ok: false, error: 'File contents do not match the file extension' }
    }
  }

  return { ok: true, mimeType: extensionMime }
}
