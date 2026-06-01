import type { RenderContext, RenderContextRunner, RenderStore } from './render-context.types.js'

const stack: RenderStore[] = []

export const renderContextRunner: RenderContextRunner = {
  getStore() {
    return stack[stack.length - 1] ?? { context: {}, templateDepth: 0 }
  },
  withStore(store, run) {
    stack.push(store)
    try {
      return run()
    } finally {
      stack.pop()
    }
  }
}

export type { RenderContext, RenderStore }
