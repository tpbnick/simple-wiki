import { env } from '$env/dynamic/public'

/** BCP 47 locale for formatted dates (set PUBLIC_WIKI_LOCALE). */
function wikiLocale(): string {
  return env.PUBLIC_WIKI_LOCALE?.trim() || 'en-US'
}

/**
 * Formats a byte count as B, KB, or MB.
 * @param bytes - File size in bytes.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

/**
 * Formats an ISO date string as a readable calendar date.
 * @param isoDate - Date string from git metadata or the database.
 */
export function formatBuildDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(wikiLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formats an ISO date string as a readable date and time.
 * @param isoDate - Date string from the database.
 */
export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(wikiLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Converts a SQLite date string to a valid ISO 8601 string for HTML datetime attributes.
 * @param isoDate - Date string from the database.
 */
export function toDatetimeAttr(isoDate: string): string {
  return new Date(isoDate).toISOString()
}

/**
 * Formats how long ago a date was.
 * @param isoDate - Date string from the database.
 * @param style - `'short'` for labels like `5m ago`, `'long'` for full words.
 */
export function formatTimeAgo(isoDate: string, style: 'short' | 'long' = 'long'): string {
  const date = new Date(isoDate)
  const secondsAgo = Math.floor((Date.now() - date.getTime()) / 1000)

  if (style === 'short') {
    if (secondsAgo < 60) return 'just now'
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`
    if (secondsAgo < 604_800) return `${Math.floor(secondsAgo / 86400)}d ago`
    return date.toLocaleDateString(wikiLocale())
  }

  if (secondsAgo < 60) return 'just now'
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`
  if (secondsAgo < 604_800) return `${Math.floor(secondsAgo / 86400)} days ago`
  return date.toLocaleDateString(wikiLocale(), { year: 'numeric', month: 'short', day: 'numeric' })
}
