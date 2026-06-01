import { AsyncLocalStorage } from 'node:async_hooks'
import type { RenderContext, RenderContextRunner, RenderStore } from './render-context.types.js'

const nodeStorage = new AsyncLocalStorage<RenderStore>()

export const renderContextRunner: RenderContextRunner = {
  getStore() {
    return nodeStorage.getStore() ?? { context: {}, templateDepth: 0 }
  },
  withStore(store, run) {
    return nodeStorage.run(store, run)
  }
}

export type { RenderContext, RenderStore }
