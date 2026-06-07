import { sanitizeSearchSnippet } from '$lib/search-snippet.js'
import { MIN_SEARCH_SUGGESTION_LENGTH } from '$lib/search-constants.js'
import { openDatabase } from './connection.js'
import type { SearchResult, SearchSuggestion } from './types.js'

export { MIN_SEARCH_SUGGESTION_LENGTH }

export class SearchError extends Error {
  constructor(message = 'Search failed') {
    super(message)
    this.name = 'SearchError'
  }
}

const MAX_SEARCH_QUERY_LENGTH = 100

const FTS_OPERATOR = /^(OR|AND|NOT|NEAR)$/i

/**
 * Builds a safe FTS5 prefix query: alphanumeric tokens only, implicit AND, no operators.
 * Exported for tests.
 */
export function buildFtsQuery(query: string): string {
  const tokens = query
    .replace(/['"]/g, ' ')
    .replace(/\*/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !FTS_OPERATOR.test(token))
    .map((token) => token.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter((token) => token.length > 0)

  if (tokens.length === 0) return ''

  return tokens.map((token) => `${token}*`).join(' ')
}

/** Searches pages using the FTS index. */
export function searchPages(query: string, limit = 20): SearchResult[] {
  const trimmed = query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
  if (!trimmed || trimmed.length < MIN_SEARCH_SUGGESTION_LENGTH) return []

  const ftsQuery = buildFtsQuery(trimmed)
  if (!ftsQuery) return []

  try {
    return openDatabase()
      .statements.search.all(ftsQuery, limit)
      .map((result) => ({
        ...result,
        snippet: sanitizeSearchSnippet(result.snippet)
      }))
  } catch (error) {
    console.error('[search] FTS query failed:', error instanceof Error ? error.message : error)
    throw new SearchError()
  }
}

/** Lightweight title/slug matches for header typeahead (excludes template pages). */
export function searchPageSuggestions(query: string, limit = 8): SearchSuggestion[] {
  const trimmed = query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
  if (trimmed.length < MIN_SEARCH_SUGGESTION_LENGTH) return []

  const ftsQuery = buildFtsQuery(trimmed)
  if (!ftsQuery) return []

  try {
    return openDatabase().statements.searchSuggestions.all(ftsQuery, limit)
  } catch (error) {
    console.error(
      '[search] suggestion query failed:',
      error instanceof Error ? error.message : error
    )
    throw new SearchError()
  }
}
