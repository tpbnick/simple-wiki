import { describe, expect, it, vi } from 'vitest'
import { createPersonId } from './id.js'

describe('createPersonId', () => {
  it('uses randomUUID when available', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555')
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { randomUUID, getRandomValues })

    expect(createPersonId()).toBe('11111111-2222-4333-8444-555555555555')
    expect(randomUUID).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('falls back to getRandomValues on plain HTTP where randomUUID is missing', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues })

    const id = createPersonId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

    vi.unstubAllGlobals()
  })
})
