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
