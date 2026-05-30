import { describe, expect, it } from 'vitest'
import { openDatabase, resetDatabaseConnection } from '$lib/db/connection.js'
import { DatabaseSwapInProgressError, beginDatabaseImport, endDatabaseImport } from '$lib/db/swap-lock.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-swap-lock-')

describe('database swap lock', () => {
  it('blocks openDatabase while a restore swap is in progress', () => {
    resetDatabaseConnection()
    beginDatabaseImport()

    try {
      expect(() => openDatabase()).toThrow(DatabaseSwapInProgressError)
    } finally {
      endDatabaseImport()
      resetDatabaseConnection()
    }
  })

  it('allows openDatabase during import when explicitly bypassed', () => {
    beginDatabaseImport()

    try {
      resetDatabaseConnection()
      expect(() => openDatabase({ duringImport: true })).not.toThrow()
    } finally {
      endDatabaseImport()
    }
  })
})
