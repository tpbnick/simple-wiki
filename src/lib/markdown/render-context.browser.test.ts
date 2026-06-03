import { describe, expect, it } from 'vitest'
import { renderContextRunner } from '$lib/markdown/render-context.browser.js'

describe('render context (browser stack)', () => {
  it('keeps context until async work finishes', async () => {
    const result = await renderContextRunner.withStore(
      { context: { canEdit: true }, templateDepth: 0 },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return renderContextRunner.getStore().context.canEdit
      }
    )

    expect(result).toBe(true)
    expect(renderContextRunner.getStore().context).toEqual({})
  })

  it('isolates concurrent async render contexts', async () => {
    const [first, second] = await Promise.all([
      renderContextRunner.withStore({ context: { canEdit: true }, templateDepth: 0 }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return renderContextRunner.getStore().context.canEdit
      }),
      renderContextRunner.withStore({ context: { canEdit: false }, templateDepth: 0 }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        return renderContextRunner.getStore().context.canEdit
      })
    ])

    expect(first).toBe(true)
    expect(second).toBe(false)
  })
})
