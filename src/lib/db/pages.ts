import { openDatabase } from './connection.js'
import { invalidatePageSlugCache, readCachedPageSlugs, writeCachedPageSlugs } from './slug-cache.js'
import { getRevisionRetentionLimit } from './settings.js'
import {
  PageConflictError,
  PageDuplicateError,
  PROTECTED_PAGE_SLUGS,
  ProtectedPageError,
  type Page,
  type PageSummary
} from './types.js'

export { invalidatePageSlugCache } from './slug-cache.js'

/** Returns all page slugs, cached until the next page write. */
export function getAllPageSlugs(): Set<string> {
  const cached = readCachedPageSlugs()
  if (cached) return cached

  const slugs = new Set(
    openDatabase()
      .statements.getAllSlugs.all()
      .map((row) => row.slug)
  )
  writeCachedPageSlugs(slugs)
  return slugs
}

/**
 * Returns a page by slug, or null when it does not exist.
 */
export function getPage(slug: string): Page | null {
  return openDatabase().statements.getPage.get(slug) ?? null
}

/** Returns every page ordered by most recently updated. */
export function getAllPages(): Page[] {
  return openDatabase().statements.getAllPages.all()
}

/** Returns full pages in a namespace, ordered by title. */
export function getPagesByNamespace(namespace: string): Page[] {
  return openDatabase().statements.getPagesByNamespace.all(namespace)
}

/** Returns the number of pages in a namespace. */
export function countPagesByNamespace(namespace: string): number {
  return openDatabase().statements.countPagesByNamespace.get(namespace)?.count ?? 0
}

/** Escapes `%`, `_`, and `\` for SQLite LIKE patterns with ESCAPE '\\'. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** Returns page metadata for article/help pages with optional search and pagination. */
export function searchContentPageSummaries(
  options: {
    query?: string
    limit?: number
    offset?: number
  } = {}
): { pages: PageSummary[]; total: number } {
  const query = options.query?.trim() ?? ''
  const limit = options.limit ?? 100
  const offset = options.offset ?? 0
  const pattern = query ? `%${escapeLikePattern(query)}%` : ''
  const { statements } = openDatabase()

  const total = statements.countContentPageSummaries.get(query, pattern, pattern)?.count ?? 0
  const pages = statements.searchContentPageSummaries.all(query, pattern, pattern, limit, offset)

  return { pages, total }
}

/** Returns the number of non-template pages in the wiki. */
export function countContentPages(): number {
  return openDatabase().statements.countAllContentPages.get()?.count ?? 0
}

/** Returns page metadata in a namespace, without body content. */
export function getPageSummaries(namespace = 'article'): PageSummary[] {
  return openDatabase().statements.getPageSummariesByNamespace.all(namespace)
}

/** Returns recently updated pages, excluding the home page. */
export function getRecentPages(limit = 10): Page[] {
  return openDatabase().statements.recentPages.all(limit)
}

/** Returns pages whose content references an upload URL. */
export function findPagesReferencingUpload(filename: string): PageSummary[] {
  const { statements } = openDatabase()
  const patterns = [`%/uploads/${filename}%`, `%/uploads/${encodeURIComponent(filename)}%`]
  return statements.findPagesReferencingUpload.all(patterns[0], patterns[1])
}

/**
 * Creates or updates a page and stores a revision when replacing existing content or title.
 * Creates use INSERT (unique-slug safe); updates never upsert over a concurrent create.
 */
export function savePage(
  slug: string,
  title: string,
  content: string,
  namespace = 'article',
  summary = '',
  expectedUpdatedAt?: string | null
): Page {
  const { db, statements } = openDatabase()

  const page = db.transaction(() => {
    const existingPage = statements.getPage.get(slug)

    if (!existingPage) {
      try {
        statements.insertPage.run({ slug, title, content, namespace })
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          throw new PageDuplicateError(`A page already exists at /wiki/${slug}`)
        }
        throw error
      }
      return statements.getPage.get(slug)!
    }

    if (expectedUpdatedAt && existingPage.updated_at !== expectedUpdatedAt) {
      throw new PageConflictError()
    }

    statements.updatePage.run({ slug, title, content, namespace })

    const contentChanged = existingPage.content !== content
    const titleChanged = existingPage.title !== title
    if (contentChanged || titleChanged) {
      statements.saveRevision.run(
        existingPage.id,
        existingPage.content,
        summary,
        existingPage.title
      )
      const retentionLimit = getRevisionRetentionLimit()
      if (retentionLimit != null) {
        statements.prunePageRevisionsOverLimit.run(existingPage.id, existingPage.id, retentionLimit)
      }
    }

    return statements.getPage.get(slug)!
  })()

  invalidatePageSlugCache()
  return page
}

/** Deletes a page by slug. */
export function deletePage(slug: string): boolean {
  if (PROTECTED_PAGE_SLUGS.has(slug)) {
    throw new ProtectedPageError()
  }

  const { statements } = openDatabase()
  const deleted = statements.deletePage.run(slug).changes > 0
  if (deleted) invalidatePageSlugCache()
  return deleted
}
