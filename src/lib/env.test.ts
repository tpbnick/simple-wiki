import { describe, expect, it } from 'vitest'
import { isPublicReadEnabled, resetServerEnvValidationForTests, validateServerEnv } from '$lib/env.js'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('env', () => {
  it('defaults PUBLIC_READ to enabled', () => {
    const original = process.env.PUBLIC_READ
    delete process.env.PUBLIC_READ
    expect(isPublicReadEnabled()).toBe(true)
    process.env.PUBLIC_READ = original
  })

  it('validates writable database and upload paths', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'wiki-env-test-'))
    const originalDatabasePath = process.env.DATABASE_PATH
    const originalUploadsDir = process.env.UPLOADS_DIR

    try {
      process.env.DATABASE_PATH = join(tempDir, 'wiki.db')
      process.env.UPLOADS_DIR = join(tempDir, 'uploads')
      resetServerEnvValidationForTests()
      expect(() => validateServerEnv()).not.toThrow()
    } finally {
      process.env.DATABASE_PATH = originalDatabasePath
      process.env.UPLOADS_DIR = originalUploadsDir
      resetServerEnvValidationForTests()
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('warns but allows COOKIE_SECURE=false in production', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'wiki-env-prod-'))
    const originalNodeEnv = process.env.NODE_ENV
    const originalCookieSecure = process.env.COOKIE_SECURE
    const originalDatabasePath = process.env.DATABASE_PATH
    const originalUploadsDir = process.env.UPLOADS_DIR
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(String(args[0]))
    }

    try {
      process.env.NODE_ENV = 'production'
      process.env.COOKIE_SECURE = 'false'
      process.env.DATABASE_PATH = join(tempDir, 'wiki.db')
      process.env.UPLOADS_DIR = join(tempDir, 'uploads')
      resetServerEnvValidationForTests()
      validateServerEnv()
      expect(warnings.some((message) => message.includes('COOKIE_SECURE=false'))).toBe(true)
    } finally {
      console.warn = warn
      process.env.NODE_ENV = originalNodeEnv
      process.env.COOKIE_SECURE = originalCookieSecure
      process.env.DATABASE_PATH = originalDatabasePath
      process.env.UPLOADS_DIR = originalUploadsDir
      resetServerEnvValidationForTests()
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
