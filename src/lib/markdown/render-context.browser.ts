import type { RenderContext, RenderContextRunner, RenderStore } from './render-context.types.js'

const stack: RenderStore[] = []

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    value !== null && typeof value === 'object' && typeof (value as Promise<T>).then === 'function'
  )
}

export const renderContextRunner: RenderContextRunner = {
  getStore() {
    return stack[stack.length - 1] ?? { context: {}, templateDepth: 0 }
  },
  withStore(store, run) {
    stack.push(store)
    let popOnExit = true
    try {
      const result = run()
      if (isPromise(result)) {
        popOnExit = false
        return result.finally(() => {
          stack.pop()
        }) as ReturnType<typeof run>
      }
      return result
    } finally {
      if (popOnExit) stack.pop()
    }
  }
}

export type { RenderContext, RenderStore }
