import { getBuildInfo } from '$lib/build-info.js'

/** Application version from build-time metadata (package.json at build). */
export function getAppVersion(): string {
  return getBuildInfo().version
}

/** Display name for this wiki instance (override with WIKI_NAME). */
export function getWikiName(): string {
  const name = process.env.WIKI_NAME?.trim()
  return name || 'Wiki'
}

/** Clears cached app version. Intended for tests. */
export function resetWikiIdentityForTests(): void {
  // Version comes from build-time __BUILD_INFO__; nothing to reset at runtime.
}
