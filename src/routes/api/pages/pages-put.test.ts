import { describe, expect, it } from 'vitest'
import { PUT } from './[slug]/+server.js'
import { getPage, savePage } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-api-pages-put-')

const user: App.Locals['user'] = {
  id: 1,
  username: 'admin',
  isAdmin: true,
  mustChangePw: false
}

describe('PUT /api/pages/[slug]', () => {
  it('returns conflict metadata when expectedUpdatedAt is stale', async () => {
    savePage('api-conflict', 'API Conflict', 'v1', 'article', 'create')
    savePage('api-conflict', 'API Conflict', 'v2', 'article', 'edit')
    const current = getPage('api-conflict')

    const response = await PUT({
      params: { slug: 'api-conflict' },
      locals: { user },
      getClientAddress: () => '127.0.0.1',
      request: new Request('http://localhost/api/pages/api-conflict', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'API Conflict',
          content: 'v3',
          namespace: 'article',
          summary: 'edit',
          expectedUpdatedAt: '2000-01-01 00:00:00'
        })
      })
    } as Parameters<typeof PUT>[0])

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/modified elsewhere/)
    expect(body.expectedUpdatedAt).toBe(current?.updated_at)
  })
})
