import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, beforeEach } from 'vitest'
import { resetDatabaseConnection } from '$lib/db/connection.js'
import { resetUploadsDirectoryForTests } from '$lib/uploads.server.js'
import { resetWikiIdentityForTests } from '$lib/wiki-identity.js'
import { resetRateLimits } from '$lib/rate-limit.js'
import { resetDatabaseSwapLockForTests } from '$lib/db/swap-lock.js'

export interface TempWikiEnv {
  tempDir: string
  databasePath: string
  uploadsPath: string
}

export interface TempWikiEnvOptions {
  wikiName?: string
  withUploads?: boolean
}

/**
 * Installs beforeEach/afterEach hooks that isolate DATABASE_PATH and UPLOADS_DIR.
 */
export function installTempWikiEnv(prefix: string, options: TempWikiEnvOptions = {}): TempWikiEnv {
  let tempDir = ''
  let originalDatabasePath: string | undefined
  let originalUploadsDir: string | undefined
  let originalWikiName: string | undefined

  beforeEach(() => {
    resetDatabaseConnection()
    resetWikiIdentityForTests()
    originalDatabasePath = process.env.DATABASE_PATH
    originalUploadsDir = process.env.UPLOADS_DIR
    originalWikiName = process.env.WIKI_NAME
    tempDir = mkdtempSync(join(tmpdir(), prefix))
    process.env.DATABASE_PATH = join(tempDir, 'test.db')
    process.env.UPLOADS_DIR = join(tempDir, 'uploads')
    if (options.wikiName) process.env.WIKI_NAME = options.wikiName
    if (options.withUploads !== false) {
      mkdirSync(process.env.UPLOADS_DIR, { recursive: true })
      resetUploadsDirectoryForTests(process.env.UPLOADS_DIR)
    } else {
      resetUploadsDirectoryForTests(process.env.UPLOADS_DIR)
    }
    resetRateLimits()
    resetDatabaseSwapLockForTests()
  })

  afterEach(() => {
    resetDatabaseConnection()
    resetDatabaseSwapLockForTests()
    rmSync(tempDir, { recursive: true, force: true })
    process.env.DATABASE_PATH = originalDatabasePath
    process.env.UPLOADS_DIR = originalUploadsDir
    process.env.WIKI_NAME = originalWikiName
    resetUploadsDirectoryForTests(originalUploadsDir)
    resetWikiIdentityForTests()
  })

  return {
    get tempDir() {
      return tempDir
    },
    get databasePath() {
      return process.env.DATABASE_PATH!
    },
    get uploadsPath() {
      return process.env.UPLOADS_DIR!
    }
  }
}
