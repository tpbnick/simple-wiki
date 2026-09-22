import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './+server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-search-route-')

const editorLocals: App.Locals = {
  user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
}

function searchEvent(locals: App.Locals, query = 'welcome') {
  return {
    url: new URL(`http://localhost/api/search?q=${query}`),
    locals,
    getClientAddress: () => '127.0.0.1'
  } as Parameters<typeof GET>[0]
}

describe('GET /api/search', () => {
  afterEach(() => {
    delete process.env.PUBLIC_READ
  })

  it('rejects anonymous reads when the wiki is private', () => {
    process.env.PUBLIC_READ = 'false'
    expect(() => GET(searchEvent({}))).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('allows authenticated reads when the wiki is private', async () => {
    process.env.PUBLIC_READ = 'false'
    const response = await GET(searchEvent(editorLocals))
    expect(response.status).toBe(200)
    expect(Array.isArray(await response.json())).toBe(true)
  })
})
