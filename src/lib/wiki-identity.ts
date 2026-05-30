import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

let cachedVersion: string | null = null

/** Application version from package.json. */
export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    version?: string
  }
  cachedVersion = pkg.version ?? '0.0.0'
  return cachedVersion
}

/** Display name for this wiki instance (override with WIKI_NAME). */
export function getWikiName(): string {
  const name = process.env.WIKI_NAME?.trim()
  return name || 'Wiki'
}

/** Clears cached app version. Intended for tests. */
export function resetWikiIdentityForTests(): void {
  cachedVersion = null
}
