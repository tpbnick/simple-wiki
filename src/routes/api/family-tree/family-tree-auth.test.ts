import { afterEach, describe, expect, it } from 'vitest'
import { POST } from './+server.js'
import { DELETE, GET, PUT } from './[slug]/+server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-family-tree-auth-')

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
}

describe('family-tree API auth', () => {
  afterEach(() => {
    delete process.env.PUBLIC_READ
  })

  it('rejects anonymous writes', async () => {
    await expect(
      POST({
        locals: {},
        getClientAddress: () => '127.0.0.1',
        request: jsonRequest('http://localhost/api/family-tree', 'POST', { title: 'Smith' })
      } as Parameters<typeof POST>[0])
    ).rejects.toMatchObject({ status: 401 })

    await expect(
      PUT({
        params: { slug: 'smith' },
        locals: {},
        getClientAddress: () => '127.0.0.1',
        request: jsonRequest('http://localhost/api/family-tree/smith', 'PUT', {
          title: 'Smith',
          data: {},
          expectedUpdatedAt: '2000-01-01 00:00:00'
        })
      } as Parameters<typeof PUT>[0])
    ).rejects.toMatchObject({ status: 401 })

    expect(() =>
      DELETE({
        params: { slug: 'smith' },
        locals: {},
        getClientAddress: () => '127.0.0.1',
        request: jsonRequest('http://localhost/api/family-tree/smith', 'DELETE')
      } as Parameters<typeof DELETE>[0])
    ).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('rejects anonymous reads when the wiki is private', () => {
    process.env.PUBLIC_READ = 'false'
    expect(() =>
      GET({
        params: { slug: 'smith' },
        locals: {},
        getClientAddress: () => '127.0.0.1'
      } as Parameters<typeof GET>[0])
    ).toThrow(expect.objectContaining({ status: 401 }))
  })
})
