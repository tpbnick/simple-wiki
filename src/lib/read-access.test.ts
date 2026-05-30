import { describe, expect, it } from 'vitest'
import { requireReadAccess } from '$lib/read-access.js'

describe('requireReadAccess', () => {
  it('allows anonymous access when PUBLIC_READ is enabled', () => {
    const original = process.env.PUBLIC_READ
    process.env.PUBLIC_READ = 'true'

    expect(() => requireReadAccess({ user: undefined })).not.toThrow()

    process.env.PUBLIC_READ = original
  })

  it('throws for anonymous access when PUBLIC_READ is disabled', () => {
    const original = process.env.PUBLIC_READ
    process.env.PUBLIC_READ = 'false'

    expect(() => requireReadAccess({ user: undefined })).toThrow()

    process.env.PUBLIC_READ = original
  })
})
