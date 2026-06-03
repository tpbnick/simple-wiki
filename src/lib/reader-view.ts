import type { TocEntry } from '$lib/markdown/index.js'

/** Reads TOC entries from merged page load data when present. */
export function tocEntriesFromPageData(pageData: unknown): TocEntry[] | null {
  if (!pageData || typeof pageData !== 'object' || !('toc' in pageData)) return null
  const toc = (pageData as { toc: unknown }).toc
  return Array.isArray(toc) ? (toc as TocEntry[]) : null
}

/**
 * TOC entry count for sidebar visibility — prefers server load data over the client store
 * so the hamburger appears on first paint and during client navigations.
 */
export function readerTocEntryCount(
  pathname: string,
  pageData: unknown,
  storeEntryCount: number
): number {
  if (!isReaderViewPath(pathname)) return 0
  const fromLoad = tocEntriesFromPageData(pageData)
  return fromLoad ? fromLoad.length : storeEntryCount
}

/** Returns true when the reader sidebar or its toggle should be shown. */
export function shouldShowReaderSidebar(
  pathname: string,
  tocEntryCount: number,
  extensionNavCount = 0
): boolean {
  return isReaderViewPath(pathname) && (tocEntryCount > 0 || extensionNavCount > 0)
}

/**
 * Returns true for article reader routes that may show the table-of-contents sidebar.
 * Excludes edit, history, search, admin, and other utility pages.
 */
export function isReaderViewPath(pathname: string): boolean {
  if (pathname === '/') return true
  return /^\/wiki\/[^/]+$/.test(pathname)
}
