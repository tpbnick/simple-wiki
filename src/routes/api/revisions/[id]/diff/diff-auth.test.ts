import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './+server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-revision-diff-auth-')

describe('GET /api/revisions/[id]/diff', () => {
  afterEach(() => {
    delete process.env.PUBLIC_READ
  })

  it('rejects anonymous reads when the wiki is private', () => {
    process.env.PUBLIC_READ = 'false'
    expect(() =>
      GET({
        params: { id: '1' },
        locals: {},
        getClientAddress: () => '127.0.0.1'
      } as Parameters<typeof GET>[0])
    ).toThrow(expect.objectContaining({ status: 401 }))
  })
})
