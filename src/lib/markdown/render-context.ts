import { AsyncLocalStorage } from 'node:async_hooks'
import type { WikiLinkOptions } from './plugins/wiki-links.js'
import type { TemplateResolver } from './plugins/templates.js'

/** Options passed into the markdown pipeline for a single render. */
export interface RenderContext {
  wikiLinks?: WikiLinkOptions
  templateResolver?: TemplateResolver
  /** When true, embedded templates may show admin-only controls. */
  canEdit?: boolean
}

interface RenderStore {
  context: RenderContext
  templateDepth: number
}

const renderStore = new AsyncLocalStorage<RenderStore>()

function getStore(): RenderStore {
  return renderStore.getStore() ?? { context: {}, templateDepth: 0 }
}

/**
 * Runs a synchronous function with markdown render options set.
 * @param context - Wiki-link and template options for this render.
 * @param run - Function that performs the render.
 */
export function withRenderContext<T>(context: RenderContext, run: () => T): T {
  const parent = renderStore.getStore()
  return renderStore.run({ context, templateDepth: parent?.templateDepth ?? 0 }, run)
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
  const parent = renderStore.getStore()
  return renderStore.run({ context, templateDepth: parent?.templateDepth ?? 0 }, run)
}

/**
 * Returns the render options for the current markdown render.
 */
export function getRenderContext(): RenderContext {
  return getStore().context
}

/** Returns the current nested template depth for this render. */
export function getTemplateDepth(): number {
  return getStore().templateDepth
}

/** Runs a function while incrementing nested template depth. */
export function withTemplateDepth<T>(run: () => T): T {
  const store = getStore()
  return renderStore.run({ context: store.context, templateDepth: store.templateDepth + 1 }, run)
}
