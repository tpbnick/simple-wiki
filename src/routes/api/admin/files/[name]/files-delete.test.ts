import { writeFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { DELETE } from './+server.js'
import { recordUpload, savePage } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'
import { uploadsDirectory } from '$lib/uploads.server.js'

installTempWikiEnv('wiki-admin-files-')

const adminLocals: App.Locals = {
  user: { id: 1, username: 'admin', mustChangePw: false, isAdmin: true }
}

const editorLocals: App.Locals = {
  user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
}

function deleteEvent(filename: string, locals: App.Locals) {
  return {
    params: { name: filename },
    locals,
    getClientAddress: () => '127.0.0.1',
    request: new Request(`http://localhost/api/admin/files/${filename}`, { method: 'DELETE' })
  } as Parameters<typeof DELETE>[0]
}

describe('DELETE /api/admin/files/[name]', () => {
  it('rejects anonymous callers', () => {
    expect(() => DELETE(deleteEvent('x.png', {}))).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('rejects non-admin callers', () => {
    expect(() => DELETE(deleteEvent('x.png', editorLocals))).toThrow(
      expect.objectContaining({ status: 403 })
    )
  })

  it('deletes an unreferenced file', async () => {
    writeFileSync(join(uploadsDirectory(), 'orphan.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    recordUpload('orphan.png', 'orphan.png', 4, 'image/png', 'hash-orphan')

    const response = await DELETE(deleteEvent('orphan.png', adminLocals))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true })
  })

  it('refuses to delete a referenced file', async () => {
    writeFileSync(join(uploadsDirectory(), 'keep.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    recordUpload('keep.png', 'keep.png', 4, 'image/png', 'hash-keep')
    savePage('uses-file', 'Uses File', 'See /uploads/keep.png', 'article', 'create')

    const response = await DELETE(deleteEvent('keep.png', adminLocals))
    expect(response.status).toBe(409)
  })
})
