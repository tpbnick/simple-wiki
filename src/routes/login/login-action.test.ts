import { describe, expect, it } from 'vitest'
import { actions } from './+page.server.js'
import { getUserByName, resolveSession } from '$lib/db/index.js'
import { SESSION_COOKIE_NAME } from '$lib/auth.js'
import { installTempWikiEnv, TEST_ADMIN_PASSWORD } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-login-route-')

function memoryCookies() {
  const store = new Map<string, string>()
  return {
    get: (name: string) => store.get(name),
    set: (name: string, value: string) => {
      store.set(name, value)
    },
    delete: (name: string) => {
      store.delete(name)
    }
  }
}

describe('login action', () => {
  it('creates a session for valid credentials', async () => {
    getUserByName('admin')
    const cookies = memoryCookies()

    await expect(
      actions.default({
        cookies,
        getClientAddress: () => '127.0.0.1',
        request: new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: 'admin',
            password: TEST_ADMIN_PASSWORD
          })
        })
      } as unknown as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 303 })

    const sessionId = cookies.get(SESSION_COOKIE_NAME)
    expect(sessionId).toBeTruthy()
    expect(resolveSession(sessionId ?? '')?.username).toBe('admin')
  })

  it('rejects invalid credentials', async () => {
    getUserByName('admin')
    const result = await actions.default({
      cookies: memoryCookies(),
      getClientAddress: () => '10.0.0.2',
      request: new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: 'admin',
          password: 'wrong-password'
        })
      })
    } as unknown as Parameters<typeof actions.default>[0])

    expect(result).toMatchObject({ status: 401 })
  })
})
