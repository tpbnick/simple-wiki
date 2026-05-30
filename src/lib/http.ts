import { error } from '@sveltejs/kit'

/** Reads and parses a JSON body with a maximum size limit. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const lengthHeader = request.headers.get('content-length')
  if (lengthHeader) {
    const length = Number(lengthHeader)
    if (Number.isFinite(length) && length > maxBytes) {
      error(413, `Request body too large (max ${maxBytes} bytes)`)
    }
  }

  const reader = request.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      error(413, `Request body too large (max ${maxBytes} bytes)`)
    }
    chunks.push(value)
  }

  if (total === 0) return null

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  const text = new TextDecoder().decode(merged)
  if (!text.trim()) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    error(400, 'Invalid JSON body')
  }
}
