import { describe, expect, it } from 'vitest'
import { withRenderContextAsync, getRenderContext } from '$lib/markdown/render-context.js'

describe('render context', () => {
  it('isolates concurrent async render contexts', async () => {
    const [first, second] = await Promise.all([
      withRenderContextAsync({ canEdit: true }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return getRenderContext().canEdit
      }),
      withRenderContextAsync({ canEdit: false }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        return getRenderContext().canEdit
      })
    ])

    expect(first).toBe(true)
    expect(second).toBe(false)
  })
})
