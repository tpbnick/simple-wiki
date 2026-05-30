/**
 * Converts a page title or wiki-link target into a URL slug.
 * @param text - Title or link target to slugify.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Best-effort human title from a slug when the original title is unknown.
 * @param slug - URL slug such as `fischbach-bei-dahn`.
 */
export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
