import type { Page } from '$lib/db/index.js'

export interface SidebarItem {
  label: string
  href: string
  external?: boolean
}

/** Toolbar button contributed by an extension to the wiki page editor. */
export interface EditorToolbarItem {
  id: string
  label: string
  description?: string
}

export interface WikiExtension {
  name: string
  version: string
  description?: string
  /** When set, the admin Extensions tab links to this URL to manage the extension. */
  manageHref?: string
  /** SQL applied when the database is first opened after extensions load. Use IF NOT EXISTS in all DDL. */
  schema?: string
  /** Versioned SQL migrations applied once per extension (tracked in app_meta). */
  migrations?: Array<{ id: string; sql: string }>
  /** Path prefixes requiring login for non-GET writes. */
  writeGuardPaths?: string[]
  hooks: WikiExtensionHooks
}

export interface WikiExtensionHooks {
  /** Transform the final rendered HTML of any page */
  onPageRender?: (html: string, page: Page) => string
  /** Return an HTML string to handle a custom template, or null to skip */
  onTemplateParse?: (name: string, params: Record<string, string>) => string | null
  /** Add items to the sidebar navigation */
  onSidebarItems?: (items: SidebarItem[]) => SidebarItem[]
  /** Add buttons to the wiki page editor toolbar */
  onEditorToolbarItems?: () => EditorToolbarItem[]
  /** Extra data for the wiki editor when relevant toolbar items are active. */
  onEditorLoad?: (activeToolIds: Set<string>) => Record<string, unknown>
  /** Clears extension caches after the live database is replaced. */
  onDatabaseReset?: () => void
}
