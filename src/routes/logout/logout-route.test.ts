import { describe, expect, it } from 'vitest'
import { POST } from './+server.js'
import { createSession, getUserByName, resolveSession } from '$lib/db/index.js'
import { SESSION_COOKIE_NAME } from '$lib/auth.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-logout-route-')

function memoryCookies(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
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

describe('POST /logout', () => {
  it('destroys the session cookie', async () => {
    const admin = getUserByName('admin')
    const sessionId = createSession(admin!.id)
    const cookies = memoryCookies({ [SESSION_COOKIE_NAME]: sessionId })

    expect(() =>
      POST({
        cookies
      } as unknown as Parameters<typeof POST>[0])
    ).toThrow(expect.objectContaining({ status: 303 }))

    expect(cookies.get(SESSION_COOKIE_NAME)).toBeUndefined()
    expect(resolveSession(sessionId)).toBeNull()
  })
})
