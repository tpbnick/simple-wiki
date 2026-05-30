import { describe, expect, it } from 'vitest'
import { handle } from './hooks.server.js'
import {
  beginDatabaseImport,
  endDatabaseImport,
  resetDatabaseSwapLockForTests
} from '$lib/db/swap-lock.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-hooks-')

function mockEvent(
  overrides: {
    pathname?: string
    method?: string
    accept?: string
    user?: App.Locals['user']
  } = {}
) {
  const pathname = overrides.pathname ?? '/wiki/home'
  const url = new URL(`http://localhost${pathname}`)
  const headers = new Headers()
  if (overrides.accept) headers.set('accept', overrides.accept)

  return {
    url,
    request: new Request(url, { method: overrides.method ?? 'GET', headers }),
    cookies: {
      get: () => undefined,
      delete: () => undefined
    },
    locals: {
      user: overrides.user
    } satisfies App.Locals
  } as unknown as Parameters<typeof handle>[0]['event']
}

describe('hooks handle', () => {
  it('returns HTML 503 during database restore for page navigations', async () => {
    resetDatabaseSwapLockForTests()
    beginDatabaseImport()

    try {
      const response = await handle({
        event: mockEvent({ accept: 'text/html' }),
        resolve: async () => new Response('ok')
      })

      expect(response.status).toBe(503)
      expect(response.headers.get('content-type')).toContain('text/html')
      expect(await response.text()).toContain('Database restore in progress')
    } finally {
      endDatabaseImport()
      resetDatabaseSwapLockForTests()
    }
  })

  it('returns JSON 503 during database restore for API requests', async () => {
    resetDatabaseSwapLockForTests()
    beginDatabaseImport()

    try {
      const response = await handle({
        event: mockEvent({ pathname: '/api/pages/home', accept: 'application/json' }),
        resolve: async () => new Response('ok')
      })

      expect(response.status).toBe(503)
      expect(response.headers.get('content-type')).toContain('application/json')
    } finally {
      endDatabaseImport()
      resetDatabaseSwapLockForTests()
    }
  })

  it('blocks unauthenticated admin API requests', async () => {
    resetDatabaseSwapLockForTests()

    const response = await handle({
      event: mockEvent({ pathname: '/api/admin/backup', method: 'GET' }),
      resolve: async () => new Response('ok')
    })

    expect(response.status).toBe(401)
  })

  it('blocks non-admin users from admin API requests', async () => {
    resetDatabaseSwapLockForTests()

    const response = await handle({
      event: mockEvent({
        pathname: '/api/admin/backup',
        method: 'GET',
        user: {
          id: 2,
          username: 'editor',
          isAdmin: false,
          mustChangePw: false
        }
      }),
      resolve: async () => new Response('ok')
    })

    expect(response.status).toBe(403)
  })

  it('blocks read APIs while the user must change their password', async () => {
    resetDatabaseSwapLockForTests()

    const response = await handle({
      event: mockEvent({
        pathname: '/api/pages/home',
        method: 'GET',
        user: {
          id: 1,
          username: 'admin',
          isAdmin: true,
          mustChangePw: true
        }
      }),
      resolve: async () => new Response('ok')
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Password change required' })
  })
})
