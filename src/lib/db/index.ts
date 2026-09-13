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
  PageDuplicateError,
  ProtectedPageError
} from './types.js'

export { resetDatabaseConnection, applyExtensionSchemas, getDatabase } from './connection.js'

export {
  getPage,
  getAllPages,
  getPagesByNamespace,
  countPagesByNamespace,
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
  countRevisions,
  restoreRevision,
  pruneAllRevisions
} from './revisions.js'
export type { RevisionDiffLine } from './revisions.js'

export { getRevisionRetentionLimit, setRevisionRetentionLimit } from './settings.js'

export {
  extensionEnabledMetaKey,
  isExtensionEnabled,
  setExtensionEnabled
} from './extension-settings.js'

export {
  MIN_SEARCH_SUGGESTION_LENGTH,
  SearchError,
  searchPages,
  searchPageSuggestions
} from './search.js'

export {
  getUserByName,
  listUsers,
  countUsers,
  createWikiUser,
  setUserPassword,
  setWikiUserAdmin,
  deleteWikiUser,
  createSession,
  resolveSession,
  touchSession,
  destroySession,
  destroyOtherSessions
} from './auth.js'

export {
  recordUpload,
  getAllUploads,
  countUploads,
  getUploadsTotalBytes,
  getUploadByName,
  getUploadByContentHash,
  renameUpload,
  removeUpload
} from './uploads.js'

export type { UserSummary } from './auth.js'
