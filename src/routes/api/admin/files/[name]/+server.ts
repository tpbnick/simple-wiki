import { json, error } from '@sveltejs/kit'
import { renameUpload, removeUpload, findPagesReferencingUpload } from '$lib/db/index.js'
import { existsSync, renameSync, unlinkSync } from 'fs'
import { extname } from 'path'
import { resolveUploadPath, normalizeUploadFilename } from '$lib/uploads.server.js'
import { readJsonBody } from '$lib/http.js'
import { requireAdmin } from '$lib/admin-access.js'
import { enforceAuthenticatedWriteRateLimit } from '$lib/api-rate-limit.js'
import type { RequestHandler } from './$types'

const MAX_RENAME_BODY_BYTES = 4096

export const PATCH: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
  requireAdmin(locals)
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'admin-file-write')

  const body = (await readJsonBody(request, MAX_RENAME_BODY_BYTES)) as { newName?: string }
  const newName = body.newName
  const oldName = params.name

  if (!newName?.trim()) error(400, 'newName is required')

  const cleanNew = normalizeUploadFilename(newName)
  if (cleanNew === oldName) return json({ ok: true })

  const oldExt = extname(oldName)
  const newExt = extname(cleanNew)
  const finalName = newExt ? cleanNew : cleanNew + oldExt

  const oldPath = resolveUploadPath(oldName)
  const newPath = resolveUploadPath(finalName)
  if (!oldPath || !newPath) error(400, 'Invalid path')
  if (!existsSync(oldPath)) error(404, 'File not found')

  try {
    renameSync(oldPath, newPath)
  } catch (renameError) {
    const code = (renameError as NodeJS.ErrnoException).code
    if (code === 'EEXIST') {
      error(409, 'A file with that name already exists')
    }
    throw renameError
  }

  try {
    renameUpload(oldName, finalName)
  } catch (dbError) {
    renameSync(newPath, oldPath)
    throw dbError
  }

  return json({ ok: true, newName: finalName })
}

export const DELETE: RequestHandler = ({ params, locals, getClientAddress }) => {
  requireAdmin(locals)
  enforceAuthenticatedWriteRateLimit(locals, getClientAddress, 'admin-file-write')

  const references = findPagesReferencingUpload(params.name)
  if (references.length > 0) {
    return json(
      {
        error: 'File is referenced by wiki pages. Remove links before deleting.',
        references: references.map((page) => ({ slug: page.slug, title: page.title }))
      },
      { status: 409 }
    )
  }

  const filePath = resolveUploadPath(params.name)
  if (!filePath) error(400, 'Invalid path')

  removeUpload(params.name)

  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }

  return json({ ok: true })
}
