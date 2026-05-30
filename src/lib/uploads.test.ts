import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  validateUpload,
  normalizeUploadFilename,
  resolveAvailableFilename,
  uploadContentHash,
  uploadPublicUrl,
  resetUploadsDirectoryForTests
} from '$lib/uploads.js'

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00
])

const WAV_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20
])

const WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00
])

let tempDir = ''
let previousUploadsDir: string | undefined

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true })
    tempDir = ''
  }
  resetUploadsDirectoryForTests(previousUploadsDir)
  previousUploadsDir = undefined
})

function withUploadsDir<T>(run: () => T): T {
  previousUploadsDir = process.env.UPLOADS_DIR
  tempDir = mkdtempSync(join(tmpdir(), 'wiki-upload-test-'))
  process.env.UPLOADS_DIR = tempDir
  resetUploadsDirectoryForTests(tempDir)
  return run()
}

describe('validateUpload', () => {
  it('accepts a valid PNG upload', () => {
    const result = validateUpload(PNG_BYTES, 'photo.png', 'image/png')
    expect(result.ok).toBe(true)
    expect(result.mimeType).toBe('image/png')
  })

  it('accepts a valid WAV upload without matching WebP', () => {
    const result = validateUpload(WAV_BYTES, 'clip.wav', 'audio/wav')
    expect(result.ok).toBe(true)
    expect(result.mimeType).toBe('audio/wav')
  })

  it('rejects SVG uploads', () => {
    const result = validateUpload(Buffer.from('<svg></svg>'), 'icon.svg', 'image/svg+xml')
    expect(result.ok).toBe(false)
  })

  it('rejects mismatched extension and content', () => {
    const result = validateUpload(PNG_BYTES, 'photo.jpg', 'image/jpeg')
    expect(result.ok).toBe(false)
  })

  it('detects WebP separately from WAV despite shared RIFF header', () => {
    const webp = validateUpload(WEBP_BYTES, 'photo.webp', 'image/webp')
    const wav = validateUpload(WAV_BYTES, 'clip.wav', 'audio/wav')

    expect(webp.ok).toBe(true)
    expect(webp.mimeType).toBe('image/webp')
    expect(wav.ok).toBe(true)
    expect(wav.mimeType).toBe('audio/wav')
  })

  it('rejects fake MP4 files that only match a weak header prefix', () => {
    const fakeMp4 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const result = validateUpload(fakeMp4, 'clip.mp4', 'video/mp4')
    expect(result.ok).toBe(false)
  })
})

describe('normalizeUploadFilename', () => {
  it('keeps spaces and punctuation in the original filename', () => {
    expect(normalizeUploadFilename('1860 Butler Census.png')).toBe('1860 Butler Census.png')
  })

  it('strips path segments only', () => {
    expect(normalizeUploadFilename('../../etc/passwd')).toBe('passwd')
  })
})

describe('uploadContentHash', () => {
  it('returns a stable SHA-256 digest', () => {
    expect(uploadContentHash(PNG_BYTES)).toHaveLength(64)
    expect(uploadContentHash(PNG_BYTES)).toBe(uploadContentHash(PNG_BYTES))
  })
})

describe('uploadPublicUrl', () => {
  it('encodes spaces in the URL path', () => {
    expect(uploadPublicUrl('1860 Butler Census.png')).toBe(
      '/uploads/1860%20Butler%20Census.png'
    )
  })
})

describe('resolveAvailableFilename', () => {
  it('keeps the original filename for a new file', () => {
    withUploadsDir(() => {
      const result = resolveAvailableFilename('1860 Butler Census.png', PNG_BYTES)
      expect(result.reusedOnDisk).toBe(false)
      expect(result.filename).toBe('1860 Butler Census.png')
    })
  })

  it('detects identical bytes already on disk', () => {
    withUploadsDir(() => {
      const first = resolveAvailableFilename('photo.png', PNG_BYTES)
      writeFileSync(join(tempDir, first.filename), PNG_BYTES)

      const again = resolveAvailableFilename('photo.png', PNG_BYTES)
      expect(again.reusedOnDisk).toBe(true)
      expect(again.filename).toBe('photo.png')
    })
  })

  it('uses numbered suffixes when the same name has different content', () => {
    withUploadsDir(() => {
      const other = Buffer.from([...PNG_BYTES, 0x00])

      const first = resolveAvailableFilename('photo.png', PNG_BYTES)
      writeFileSync(join(tempDir, first.filename), PNG_BYTES)

      const second = resolveAvailableFilename('photo.png', other)

      expect(first.filename).toBe('photo.png')
      expect(second.reusedOnDisk).toBe(false)
      expect(second.filename).toBe('photo-2.png')
    })
  })
})
