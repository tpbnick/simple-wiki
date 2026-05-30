import { describe, expect, it } from 'vitest'
import {
  validateZipArchiveLimits,
  validateUnzippedEntrySizes,
  ZipSafetyError
} from '$lib/zip-safety.js'
import { zipSync } from 'fflate'

describe('validateZipArchiveLimits', () => {
  it('accepts a small valid zip archive', () => {
    const zip = zipSync({
      'manifest.txt': new TextEncoder().encode('wiki_name=Wiki'),
      'wiki.db': new Uint8Array([1, 2, 3])
    })

    expect(() =>
      validateZipArchiveLimits(zip, {
        maxEntries: 10,
        maxTotalUncompressed: 1024,
        maxEntryUncompressed: 1024
      })
    ).not.toThrow()
  })

  it('rejects archives with too many entries', () => {
    const zip = zipSync({ 'a.txt': new Uint8Array([1]) })
    expect(() =>
      validateZipArchiveLimits(zip, {
        maxEntries: 0,
        maxTotalUncompressed: 1024,
        maxEntryUncompressed: 1024
      })
    ).toThrow(ZipSafetyError)
  })
})

describe('validateUnzippedEntrySizes', () => {
  it('rejects decompressed entries that exceed limits', () => {
    expect(() =>
      validateUnzippedEntrySizes(
        { 'wiki.db': new Uint8Array(2048) },
        {
          maxEntries: 10,
          maxTotalUncompressed: 1024,
          maxEntryUncompressed: 1024
        }
      )
    ).toThrow(ZipSafetyError)
  })
})
