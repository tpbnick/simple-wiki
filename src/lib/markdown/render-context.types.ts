import type { WikiLinkOptions } from './plugins/wiki-links.js'
import type { TemplateResolver } from './plugins/templates.js'

/** Options passed into the markdown pipeline for a single render. */
export interface RenderContext {
  wikiLinks?: WikiLinkOptions
  templateResolver?: TemplateResolver
  /** When true, embedded templates may show admin-only controls. */
  canEdit?: boolean
}

export interface RenderStore {
  context: RenderContext
  templateDepth: number
}

export type RenderContextRunner = {
  getStore: () => RenderStore
  withStore: <T>(store: RenderStore, run: () => T) => T
}
