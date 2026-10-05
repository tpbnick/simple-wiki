import { describe, expect, it } from 'vitest'
import { actions } from './+page.server.js'
import { getUserByName, listUsers } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-admin-users-')

const adminLocals: App.Locals = {
  user: { id: 1, username: 'admin', mustChangePw: false, isAdmin: true }
}

const editorLocals: App.Locals = {
  user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
}

function actionEvent(locals: App.Locals, fields: Record<string, string>) {
  return {
    locals,
    getClientAddress: () => '127.0.0.1',
    request: new Request('http://localhost/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields)
    }),
    url: new URL('http://localhost/admin')
  }
}

describe('admin user actions', () => {
  it('rejects anonymous createUser', async () => {
    await expect(
      actions.createUser(
        actionEvent({}, { username: 'newbie' }) as Parameters<typeof actions.createUser>[0]
      )
    ).rejects.toMatchObject({ status: 303 })
  })

  it('rejects non-admin createUser', async () => {
    await expect(
      actions.createUser(
        actionEvent(editorLocals, { username: 'newbie' }) as Parameters<
          typeof actions.createUser
        >[0]
      )
    ).rejects.toMatchObject({ status: 403 })
  })

  it('creates and deletes a user as admin', async () => {
    getUserByName('admin')

    const created = await actions.createUser(
      actionEvent(adminLocals, { username: 'temp-user' }) as Parameters<
        typeof actions.createUser
      >[0]
    )
    expect(created).toMatchObject({ userCreated: { username: 'temp-user' } })
    const user = getUserByName('temp-user')
    expect(user).toBeTruthy()

    const deleted = await actions.deleteUser(
      actionEvent(adminLocals, { userId: String(user!.id) }) as Parameters<
        typeof actions.deleteUser
      >[0]
    )
    expect(deleted).toMatchObject({ userDeleted: true })
    expect(getUserByName('temp-user')).toBeNull()
    expect(listUsers().some((entry) => entry.username === 'temp-user')).toBe(false)
  })

  it('rejects deleting the current admin', async () => {
    getUserByName('admin')
    const result = await actions.deleteUser(
      actionEvent(adminLocals, { userId: '1' }) as Parameters<typeof actions.deleteUser>[0]
    )
    expect(result).toMatchObject({ status: 400 })
  })
})
