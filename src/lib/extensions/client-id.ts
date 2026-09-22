/** Folder name from an `extensions/<id>/...` glob path. */
export function extensionIdFromGlobPath(path: string): string | null {
  return path.match(/\/extensions\/([^/]+)\//)?.[1] ?? null
}
