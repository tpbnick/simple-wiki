import { error } from '@sveltejs/kit'
import { createReadStream, existsSync, statSync } from 'fs'
import { extname } from 'path'
import { Readable } from 'node:stream'
import { mimeTypeForExtension } from '$lib/uploads.js'
import { isRegularUploadFile, resolveUploadPath } from '$lib/uploads.server.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ params, locals, request }) => {
  requireReadAccess(locals)
  const filePath = resolveUploadPath(params.filename)
  if (!filePath) error(400, 'Invalid path')
  if (!existsSync(filePath) || !isRegularUploadFile(filePath)) error(404, 'File not found')

  const fileStat = statSync(filePath)
  const extension = extname(params.filename).toLowerCase()
  const contentType = mimeTypeForExtension(extension)
  const etag = `"${fileStat.size}-${fileStat.mtimeMs}"`
  const lastModified = fileStat.mtime.toUTCString()
  const cacheHeaders = {
    ETag: etag,
    'Last-Modified': lastModified
  }

  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
    return new Response(null, { status: 304, headers: cacheHeaders })
  }

  const ifModifiedSince = request.headers.get('if-modified-since')
  if (ifModifiedSince) {
    const sinceMs = Date.parse(ifModifiedSince)
    if (!Number.isNaN(sinceMs) && fileStat.mtimeMs <= sinceMs) {
      return new Response(null, { status: 304, headers: cacheHeaders })
    }
  }

  const stream = createReadStream(filePath)

  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(fileStat.size),
      ...cacheHeaders
    }
  })
}
