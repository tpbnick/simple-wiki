const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/** Plain-text label for a person name that may contain wiki link syntax. */
export function personDisplayName(name: string): string {
  return name.replace(WIKI_LINK_PATTERN, (_, target: string, label?: string) =>
    (label?.trim() || target.trim())
  )
}

/** Parses a birth year from free-form values like "1949" or "1949?". */
export function parseBirthYear(value?: string): number | null {
  if (!value?.trim()) return null
  const match = value.trim().match(/\d{3,4}/)
  return match ? Number(match[0]) : null
}

/** First token of a display name, lowercased for stable sorting. */
export function firstName(name: string): string {
  const display = personDisplayName(name).trim()
  return (display.split(/\s+/)[0] ?? display).toLowerCase()
}

/** Sort key: birth year ascending, then first name alphabetically. Missing years sort last. */
export function comparePeopleByBirthThenName(
  a: { name: string; birthYear?: string },
  b: { name: string; birthYear?: string }
): number {
  const yearA = parseBirthYear(a.birthYear)
  const yearB = parseBirthYear(b.birthYear)

  if (yearA != null && yearB != null && yearA !== yearB) return yearA - yearB
  if (yearA != null && yearB == null) return -1
  if (yearA == null && yearB != null) return 1

  return firstName(a.name).localeCompare(firstName(b.name), undefined, { sensitivity: 'base' })
}
