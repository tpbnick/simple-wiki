import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { POST } from '../routes/api/admin/backup/+server.js'
import { createBackupArchive } from '$lib/backup.js'
import { getPage, savePage } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'
import { uploadsDirectory } from '$lib/uploads.server.js'

installTempWikiEnv('wiki-backup-route-')

const adminLocals: App.Locals = {
  user: { id: 1, username: 'admin', mustChangePw: false, isAdmin: true }
}

describe('POST /api/admin/backup', () => {
  it('imports a backup and restores uploads when restoreUploads=on', async () => {
    savePage('route-page', 'Route Page', 'original', 'article', 'create')
    writeFileSync(join(uploadsDirectory(), 'asset.txt'), 'original-bytes')

    const archive = await createBackupArchive({ includeUploads: true })
    savePage('route-page', 'Route Page', 'changed', 'article', 'edit')
    writeFileSync(join(uploadsDirectory(), 'asset.txt'), 'changed-bytes')

    const formData = new FormData()
    formData.append(
      'backup',
      new File([Buffer.from(archive)], 'backup.zip', { type: 'application/zip' })
    )
    formData.append('restoreUploads', 'on')
    formData.append('overwriteDatabase', 'on')

    const response = await POST({
      locals: adminLocals,
      getClientAddress: () => '127.0.0.1',
      request: new Request('http://localhost/api/admin/backup', {
        method: 'POST',
        body: formData
      })
    } as Parameters<typeof POST>[0])

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(getPage('route-page')?.content).toBe('original')
    expect(readFileSync(join(uploadsDirectory(), 'asset.txt'), 'utf8')).toBe('original-bytes')
  })

  it('rejects import without database overwrite confirmation', async () => {
    const archive = await createBackupArchive()
    const formData = new FormData()
    formData.append(
      'backup',
      new File([Buffer.from(archive)], 'backup.zip', { type: 'application/zip' })
    )

    await expect(
      POST({
        locals: adminLocals,
        getClientAddress: () => '127.0.0.1',
        request: new Request('http://localhost/api/admin/backup', {
          method: 'POST',
          body: formData
        })
      } as Parameters<typeof POST>[0])
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects non-admin callers', async () => {
    const formData = new FormData()
    formData.append('backup', new File(['not-a-zip'], 'backup.zip'))

    await expect(
      POST({
        locals: {},
        getClientAddress: () => '127.0.0.1',
        request: new Request('http://localhost/api/admin/backup', {
          method: 'POST',
          body: formData
        })
      } as Parameters<typeof POST>[0])
    ).rejects.toMatchObject({ status: 401 })
  })
})
