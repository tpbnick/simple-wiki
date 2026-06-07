export type {
  Page,
  PageSummary,
  RecentChange,
  Revision,
  SearchResult,
  SearchSuggestion,
  Upload,
  User
} from './types.js'

export {
  VALID_NAMESPACES,
  PROTECTED_PAGE_SLUGS,
  PageConflictError,
  ProtectedPageError
} from './types.js'

export { resetDatabaseConnection, applyExtensionSchemas, getDatabase } from './connection.js'

export {
  getPage,
  getAllPages,
  getPageSummaries,
  searchContentPageSummaries,
  countContentPages,
  getAllPageSlugs,
  getRecentPages,
  savePage,
  deletePage,
  findPagesReferencingUpload,
  invalidatePageSlugCache
} from './pages.js'

export {
  getRevisions,
  getRevisionDiff,
  getRevisionPostEditSnapshot,
  getRecentRevisions,
  restoreRevision,
  pruneAllRevisions
} from './revisions.js'
export type { RevisionDiffLine } from './revisions.js'

export { getRevisionRetentionLimit, setRevisionRetentionLimit } from './settings.js'

export {
  MIN_SEARCH_SUGGESTION_LENGTH,
  SearchError,
  searchPages,
  searchPageSuggestions
} from './search.js'

export {
  getUserByName,
  listUsers,
  createWikiUser,
  setUserPassword,
  createSession,
  resolveSession,
  touchSession,
  destroySession,
  destroyOtherSessions
} from './auth.js'

export {
  recordUpload,
  getAllUploads,
  getUploadByName,
  getUploadByContentHash,
  renameUpload,
  removeUpload
} from './uploads.js'

export type { UserSummary } from './auth.js'
