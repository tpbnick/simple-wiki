export interface Page {
  id: number
  slug: string
  title: string
  content: string
  namespace: string
  created_at: string
  updated_at: string
}

/** Page metadata without body content (for list views). */
export interface PageSummary {
  id: number
  slug: string
  title: string
  namespace: string
  created_at: string
  updated_at: string
}

export interface Revision {
  id: number
  page_id: number
  /** Snapshot of page content before this edit. */
  content: string
  summary: string
  /** Snapshot of page title before this edit (null on legacy rows). */
  title: string | null
  created_at: string
}

/** A single edit event for recent-changes views. */
export interface RecentChange {
  id: number
  slug: string
  title: string
  namespace: string
  summary: string
  created_at: string
}

export interface SearchResult {
  slug: string
  title: string
  namespace: string
  snippet: string
  rank: number
}

export interface SearchSuggestion {
  slug: string
  title: string
}

export interface User {
  id: number
  username: string
  password_hash: string
  must_change_pw: number
  is_admin: number
  created_at: string
}

export interface Upload {
  id: number
  filename: string
  original_name: string
  size: number
  mime_type: string
  content_hash: string | null
  created_at: string
}

export const VALID_NAMESPACES = new Set(['article', 'template', 'help'])

/** Slugs that cannot be deleted through the API. */
export const PROTECTED_PAGE_SLUGS = new Set(['home', 'help'])

/** Thrown when a page save conflicts with a newer server revision. */
export class PageConflictError extends Error {
  constructor(message = 'Page was modified since you started editing') {
    super(message)
    this.name = 'PageConflictError'
  }
}

/** Thrown when attempting to delete a protected system page. */
export class ProtectedPageError extends Error {
  constructor(message = 'This page cannot be deleted') {
    super(message)
    this.name = 'ProtectedPageError'
  }
}
