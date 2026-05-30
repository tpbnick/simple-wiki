import { execSync } from 'node:child_process'

const REPO_URL = 'https://github.com/tpbnick/simple-wiki'

/** @param {string} cmd */
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/** @returns {{ commitSha: string, shortCommit: string, commitDate: string, commitUrl: string, repositoryUrl: string }} */
export function getBuildInfo() {
  const envCommit = process.env.GIT_COMMIT?.trim()
  const commitSha =
    envCommit && envCommit !== 'unknown' ? envCommit : git('rev-parse HEAD') || 'unknown'

  const envShort = process.env.GIT_SHORT_COMMIT?.trim()
  const shortCommit =
    envShort ||
    (commitSha !== 'unknown' ? git('rev-parse --short HEAD') : null) ||
    (commitSha !== 'unknown' ? commitSha.slice(0, 7) : 'unknown')

  const commitDate =
    process.env.GIT_COMMIT_DATE?.trim() ||
    git('log -1 --format=%cI') ||
    new Date().toISOString()

  const commitUrl =
    commitSha !== 'unknown' ? `${REPO_URL}/commit/${commitSha}` : REPO_URL

  return {
    commitSha,
    shortCommit,
    commitDate,
    commitUrl,
    repositoryUrl: REPO_URL
  }
}
