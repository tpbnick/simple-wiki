import { openDatabase } from './connection.js'
import type { Upload } from './types.js'

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  )
}

/** Stores upload metadata after a file is written to disk. */
export function recordUpload(
  filename: string,
  originalName: string,
  size: number,
  mimeType: string,
  contentHash: string
): Upload {
  const { db, statements } = openDatabase()

  return db.transaction(() => {
    const existingByHash = statements.getUploadByContentHash.get(contentHash)
    if (existingByHash) return existingByHash

    try {
      statements.insertUpload.run(filename, originalName, size, mimeType, contentHash)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const raced = statements.getUploadByContentHash.get(contentHash)
        if (raced) return raced
      }
      throw error
    }

    const upload = statements.getUploadByName.get(filename)
    if (upload) return upload

    const raced = statements.getUploadByContentHash.get(contentHash)
    if (raced) return raced

    throw new Error(`Failed to record upload metadata for ${filename}`)
  })()
}

/** Returns all uploads ordered by newest first. */
export function getAllUploads(): Upload[] {
  return openDatabase().statements.getAllUploads.all()
}

/** Returns the number of upload records. */
export function countUploads(): number {
  return openDatabase().statements.countUploads.get()?.count ?? 0
}

/** Returns total stored upload bytes from metadata. */
export function getUploadsTotalBytes(): number {
  return openDatabase().statements.sumUploadBytes.get()?.total ?? 0
}

/** Returns upload metadata for a stored filename, if present. */
export function getUploadByName(filename: string): Upload | null {
  return openDatabase().statements.getUploadByName.get(filename) ?? null
}

/** Returns upload metadata for a content hash, if present. */
export function getUploadByContentHash(contentHash: string): Upload | null {
  return openDatabase().statements.getUploadByContentHash.get(contentHash) ?? null
}

/** Renames an upload in the database and updates page references. */
export function renameUpload(oldFilename: string, newFilename: string): void {
  const { db, statements } = openDatabase()

  db.transaction(() => {
    statements.renameUpload.run(newFilename, oldFilename)

    const replacements: Array<[string, string]> = [
      [`/uploads/${oldFilename}`, `/uploads/${newFilename}`]
    ]
    const encodedOld = `/uploads/${encodeURIComponent(oldFilename)}`
    const encodedNew = `/uploads/${encodeURIComponent(newFilename)}`
    if (encodedOld !== replacements[0][0]) {
      replacements.push([encodedOld, encodedNew])
    }

    for (const [from, to] of replacements) {
      statements.bulkReplaceContent.run(from, to)
    }
  })()
}

/** Removes upload metadata from the database. */
export function removeUpload(filename: string): void {
  openDatabase().statements.deleteUpload.run(filename)
}
