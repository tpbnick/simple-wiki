import { applyExtensionSchemas } from '$lib/db/connection.js'
import { isExtensionEnabled as readExtensionEnabled } from '$lib/db/extension-settings.js'
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

function extensionIdFromSource(source: string): string {
  const match = source.match(/\/extensions\/([^/]+)\/index\.ts$/)
  return match?.[1] ?? source
}

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
  return { ...extension, id: extensionIdFromSource(source) }
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

function getActiveExtensions(): WikiExtension[] {
  return loadedExtensions.filter((extension) => extension.id && readExtensionEnabled(extension.id))
}

function extensionGuardPaths(extension: WikiExtension): string[] {
  const paths = new Set<string>()
  if (extension.manageHref) paths.add(extension.manageHref)
  for (const path of extension.writeGuardPaths ?? []) {
    paths.add(path)
  }
  return [...paths]
}

function matchesGuardPath(pathname: string, guardPath: string): boolean {
  return pathname === guardPath || pathname.startsWith(`${guardPath}/`)
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

/** Returns whether an extension is enabled in app settings. */
export function isExtensionEnabled(id: string): boolean {
  return readExtensionEnabled(id)
}

/** Returns the first disabled extension blocking a request path, if any. */
export function findDisabledExtensionForPath(pathname: string): WikiExtension | null {
  for (const extension of loadedExtensions) {
    if (!extension.id || readExtensionEnabled(extension.id)) continue
    if (extensionGuardPaths(extension).some((path) => matchesGuardPath(pathname, path))) {
      return extension
    }
  }
  return null
}

/** Returns editor toolbar items contributed by enabled extensions. */
export function getEditorToolbarItems(): EditorToolbarItem[] {
  return getActiveExtensions().flatMap(
    (extension) => extension.hooks.onEditorToolbarItems?.() ?? []
  )
}

/** Runs page-render hooks from enabled extensions. */
export function runOnPageRender(html: string, page: Page): string {
  return getActiveExtensions().reduce(
    (output, extension) =>
      extension.hooks.onPageRender ? extension.hooks.onPageRender(output, page) : output,
    html
  )
}

/** Runs template-parse hooks from enabled extensions. */
export function runOnTemplateParse(name: string, params: Record<string, string>): string | null {
  for (const extension of getActiveExtensions()) {
    if (!extension.hooks.onTemplateParse) continue
    const result = extension.hooks.onTemplateParse(name, params)
    if (result != null) return result
  }
  return null
}

/** Runs sidebar hooks from enabled extensions. */
export function runOnSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return getActiveExtensions().reduce(
    (output, extension) =>
      extension.hooks.onSidebarItems ? extension.hooks.onSidebarItems(output) : output,
    items
  )
}

/** Path prefixes that require login for non-GET writes (from enabled extensions). */
export function getExtensionWriteGuardPaths(): string[] {
  return getActiveExtensions().flatMap((extension) => extension.writeGuardPaths ?? [])
}

/** Merges editor load data from enabled extensions for active toolbar items. */
export function getEditorLoadData(activeTools: EditorToolbarItem[]): Record<string, unknown> {
  const toolIds = new Set(activeTools.map((tool) => tool.id))
  const data: Record<string, unknown> = {}

  for (const extension of getActiveExtensions()) {
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
