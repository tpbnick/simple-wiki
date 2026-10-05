import { describe, expect, it } from 'vitest'
import { actions } from './+page.server.js'
import { getPage, getRevisions, savePage } from '$lib/db/index.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-history-restore-')

const editorLocals: App.Locals = {
  user: { id: 2, username: 'editor', mustChangePw: false, isAdmin: false }
}

function restoreEvent(locals: App.Locals, slug: string, fields: Record<string, string>) {
  return {
    locals,
    params: { slug },
    getClientAddress: () => '127.0.0.1',
    request: new Request(`http://localhost/wiki/${slug}/history`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields)
    })
  } as Parameters<typeof actions.restore>[0]
}

describe('history restore action', () => {
  it('rejects anonymous restore', async () => {
    const result = await actions.restore(restoreEvent({}, 'home', { revisionId: '1' }))
    expect(result).toMatchObject({ status: 401 })
  })

  it('restores a revision for a signed-in editor', async () => {
    savePage('restore-me', 'Restore Me', 'version-one', 'article', 'create')
    savePage('restore-me', 'Restore Me', 'version-two', 'article', 'edit')
    savePage('restore-me', 'Restore Me', 'version-three', 'article', 'edit')

    const firstEdit = getRevisions('restore-me').at(-1)
    expect(firstEdit).toBeTruthy()
    const current = getPage('restore-me')

    await expect(
      actions.restore(
        restoreEvent(editorLocals, 'restore-me', {
          revisionId: String(firstEdit!.id),
          expectedUpdatedAt: current!.updated_at
        })
      )
    ).rejects.toMatchObject({ status: 303 })

    expect(getPage('restore-me')?.content).toBe('version-two')
  })
})
