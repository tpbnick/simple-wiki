import { accessSync, constants, mkdirSync } from 'fs'
import { dirname } from 'path'
import { resolveDatabasePath } from '$lib/db/connection.js'
import { uploadsDirectory } from '$lib/uploads.js'

let validated = false

function assertWritableDirectory(label: string, directory: string): void {
  try {
    mkdirSync(directory, { recursive: true })
    accessSync(directory, constants.W_OK)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${label} is not writable: ${message}`)
  }
}

function assertWritableFilePath(label: string, filePath: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    accessSync(dirname(filePath), constants.W_OK)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${label} is not writable: ${message}`)
  }
}

/** Returns false when PUBLIC_READ is `false` or `0` (private wiki). Default: public read. */
export function isPublicReadEnabled(): boolean {
  const value = process.env.PUBLIC_READ?.trim().toLowerCase()
  if (value === 'false' || value === '0') return false
  return true
}

/** Validates environment configuration once at server startup. */
export function validateServerEnv(): void {
  if (validated) return
  validated = true

  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'false') {
    console.warn(
      '[env] COOKIE_SECURE=false — sessions work over plain HTTP. Use HTTPS (and COOKIE_SECURE=true) when exposed beyond localhost.'
    )
  }

  if (!isPublicReadEnabled()) {
    console.log('[env] PUBLIC_READ=false — wiki content and read APIs require login')
  }

  try {
    assertWritableFilePath('DATABASE_PATH', resolveDatabasePath())
    const uploadsDir = uploadsDirectory()
    assertWritableDirectory('UPLOADS_DIR', uploadsDir)
    console.log(`[env] UPLOADS_DIR=${uploadsDir}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[env] ${message}`)
  }
}

/** Clears the one-time validation flag. Intended for tests. */
export function resetServerEnvValidationForTests(): void {
  validated = false
}
