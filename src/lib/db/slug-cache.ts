let cachedSlugs: Set<string> | null = null

/** Returns the cached slug set when populated. */
export function readCachedPageSlugs(): Set<string> | null {
  return cachedSlugs
}

/** Stores the slug set in the process-local cache. */
export function writeCachedPageSlugs(slugs: Set<string>): void {
  cachedSlugs = slugs
}

/** Clears the slug cache after page content changes. */
export function invalidatePageSlugCache(): void {
  cachedSlugs = null
}
