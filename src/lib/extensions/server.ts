import { applyExtensionSchemas } from '$lib/db/connection.js'
import type { WikiExtension, WikiExtensionHooks, SidebarItem, EditorToolbarItem } from './types.js'
import type { Page } from '$lib/db/index.js'

const loadedExtensions: WikiExtension[] = []
let extensionsLoaded = false

type ExtensionModule = { default?: WikiExtension } & Partial<WikiExtension>

/** TypeScript extensions compiled into the server bundle at build time. */
const bundledExtensionModules = import.meta.glob<ExtensionModule>(
  '../../../extensions/*/index.ts',
  { eager: true }
)

function isBundledExtensionEnabled(source: string): boolean {
  if (!source.includes('/example/')) return true
  return process.env.NODE_ENV !== 'production'
}

function validateExtensionModule(extension: WikiExtension, source: string): boolean {
  if (!extension.name?.trim()) {
    console.error(`[extensions] missing name: ${source}`)
    return false
  }
  if (!extension.version?.trim()) {
    console.error(`[extensions] missing version: ${source}`)
    return false
  }
  if (typeof extension.hooks !== 'object' || extension.hooks === null) {
    console.error(`[extensions] invalid hooks: ${source}`)
    return false
  }
  return true
}

function normalizeExtensionModule(module: ExtensionModule, source: string): WikiExtension | null {
  const extension = (module.default ?? module) as WikiExtension
  if (!validateExtensionModule(extension, source)) return null
  return extension
}

function loadBundledExtensions(): WikiExtension[] {
  const extensions: WikiExtension[] = []

  for (const [source, module] of Object.entries(bundledExtensionModules)) {
    if (!isBundledExtensionEnabled(source)) {
      console.log(`[extensions] skipped dev-only bundled extension: ${source}`)
      continue
    }

    const extension = normalizeExtensionModule(module, source)
    if (!extension) continue
    extensions.push(extension)
    console.log(`[extensions] bundled: ${extension.name} v${extension.version}`)
  }

  return extensions
}

/** Loads bundled extensions once per process. Idempotent; safe to call from tests after reset. */
export function loadExtensions(): void {
  if (extensionsLoaded) return

  loadedExtensions.push(...loadBundledExtensions())
  applyExtensionSchemas(loadedExtensions)
  extensionsLoaded = true
}

export function resetExtensionsForTests(): void {
  extensionsLoaded = false
  loadedExtensions.length = 0
}

/** Returns all loaded extensions. */
export function getExtensions(): WikiExtension[] {
  return loadedExtensions
}

/** Returns editor toolbar items contributed by loaded extensions. */
export function getEditorToolbarItems(): EditorToolbarItem[] {
  return loadedExtensions.flatMap((extension) => extension.hooks.onEditorToolbarItems?.() ?? [])
}

/** Runs page-render hooks from loaded extensions. */
export function runOnPageRender(html: string, page: Page): string {
  return loadedExtensions.reduce(
    (output, extension) =>
      extension.hooks.onPageRender ? extension.hooks.onPageRender(output, page) : output,
    html
  )
}

/** Runs template-parse hooks from loaded extensions. */
export function runOnTemplateParse(name: string, params: Record<string, string>): string | null {
  for (const extension of loadedExtensions) {
    if (!extension.hooks.onTemplateParse) continue
    const result = extension.hooks.onTemplateParse(name, params)
    if (result != null) return result
  }
  return null
}

/** Runs sidebar hooks from loaded extensions. */
export function runOnSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return loadedExtensions.reduce(
    (output, extension) =>
      extension.hooks.onSidebarItems ? extension.hooks.onSidebarItems(output) : output,
    items
  )
}

/** Path prefixes that require login for non-GET writes (from loaded extensions). */
export function getExtensionWriteGuardPaths(): string[] {
  return loadedExtensions.flatMap((extension) => extension.writeGuardPaths ?? [])
}

/** Merges editor load data from extensions for active toolbar items. */
export function getEditorLoadData(activeTools: EditorToolbarItem[]): Record<string, unknown> {
  const toolIds = new Set(activeTools.map((tool) => tool.id))
  const data: Record<string, unknown> = {}

  for (const extension of loadedExtensions) {
    if (!extension.hooks.onEditorLoad) continue
    Object.assign(data, extension.hooks.onEditorLoad(toolIds))
  }

  return data
}

/** Clears extension-local caches after a database restore or reconnect. */
export function runOnDatabaseReset(): void {
  for (const extension of loadedExtensions) {
    extension.hooks.onDatabaseReset?.()
  }
}

export type { WikiExtension, WikiExtensionHooks, SidebarItem, EditorToolbarItem }
