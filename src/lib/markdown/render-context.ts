import { browser } from '$app/environment'
import { renderContextRunner as browserRunner } from './render-context.browser.js'
import type { RenderContext } from './render-context.types.js'
import type { RenderContextRunner } from './render-context.types.js'

export type { RenderContext } from './render-context.types.js'

const runner: RenderContextRunner = browser
  ? browserRunner
  : (await import('./render-context.node.js')).renderContextRunner

/**
 * Runs a synchronous function with markdown render options set.
 * @param context - Wiki-link and template options for this render.
 * @param run - Function that performs the render.
 */
export function withRenderContext<T>(context: RenderContext, run: () => T): T {
  const parent = runner.getStore()
  const store = { context, templateDepth: parent.templateDepth }
  return runner.withStore(store, run)
}

/**
 * Runs an async function with markdown render options set.
 * @param context - Wiki-link and template options for this render.
 * @param run - Async function that performs the render.
 */
export async function withRenderContextAsync<T>(
  context: RenderContext,
  run: () => Promise<T>
): Promise<T> {
  const parent = runner.getStore()
  const store = { context, templateDepth: parent.templateDepth }
  return runner.withStore(store, run)
}

/**
 * Returns the render options for the current markdown render.
 */
export function getRenderContext(): RenderContext {
  return runner.getStore().context
}

/** Returns the current nested template depth for this render. */
export function getTemplateDepth(): number {
  return runner.getStore().templateDepth
}

/** Runs a function while incrementing nested template depth. */
export function withTemplateDepth<T>(run: () => T): T {
  const parent = runner.getStore()
  const store = { context: parent.context, templateDepth: parent.templateDepth + 1 }
  return runner.withStore(store, run)
}
