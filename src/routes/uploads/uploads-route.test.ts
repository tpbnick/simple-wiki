import { symlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { GET } from './[filename]/+server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'
import { uploadsDirectory } from '$lib/uploads.server.js'

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

installTempWikiEnv('wiki-uploads-route-')

describe('GET /uploads/[filename]', () => {
  it('returns 200 with image content-type for an existing file', async () => {
    writeFileSync(join(uploadsDirectory(), 'serve-test.png'), PNG_BYTES)

    const response = await GET({
      params: { filename: 'serve-test.png' },
      locals: {},
      request: new Request('http://localhost/uploads/serve-test.png')
    } as Parameters<typeof GET>[0])

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PNG_BYTES)).toBe(true)
  })

  it('returns 404 when the file is missing', () => {
    expect(() =>
      GET({
        params: { filename: 'does-not-exist.png' },
        locals: {},
        request: new Request('http://localhost/uploads/does-not-exist.png')
      } as Parameters<typeof GET>[0])
    ).toThrow(expect.objectContaining({ status: 404 }))
  })

  it('returns 400 for path traversal attempts', () => {
    expect(() =>
      GET({
        params: { filename: '../wiki.db' },
        locals: {},
        request: new Request('http://localhost/uploads/../wiki.db')
      } as Parameters<typeof GET>[0])
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('returns 404 for symlinks under the uploads directory', () => {
    writeFileSync(join(uploadsDirectory(), 'real-target.png'), PNG_BYTES)
    symlinkSync(
      join(uploadsDirectory(), 'real-target.png'),
      join(uploadsDirectory(), 'link-target.png')
    )

    expect(() =>
      GET({
        params: { filename: 'link-target.png' },
        locals: {},
        request: new Request('http://localhost/uploads/link-target.png')
      } as Parameters<typeof GET>[0])
    ).toThrow(expect.objectContaining({ status: 404 }))
  })
})
