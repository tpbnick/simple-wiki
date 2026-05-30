export interface BuildInfo {
  commitSha: string
  shortCommit: string
  commitDate: string
  commitUrl: string
  repositoryUrl: string
}

declare const __BUILD_INFO__: BuildInfo | undefined

const FALLBACK: BuildInfo = {
  commitSha: 'unknown',
  shortCommit: 'unknown',
  commitDate: new Date().toISOString(),
  commitUrl: 'https://github.com/tpbnick/simple-wiki',
  repositoryUrl: 'https://github.com/tpbnick/simple-wiki'
}

/** Build-time git metadata injected by Vite. */
export function getBuildInfo(): BuildInfo {
  return typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : FALLBACK
}
