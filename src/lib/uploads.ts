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

export interface UploadValidationResult {
  ok: boolean
  mimeType?: string
  error?: string
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

/**
 * Returns true when the browser-reported MIME type is allowed for upload.
 * @param mimeType - MIME type from the uploaded file.
 */
export function isAllowedUploadType(mimeType: string): boolean {
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)
}
