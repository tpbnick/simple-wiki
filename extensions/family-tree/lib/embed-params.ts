/** Reads the tree id from template params (`family`, with legacy `slug` fallback). */
export function resolveFamilyTreeParam(params: Record<string, string>): string {
  return (params.family ?? params.slug ?? '').trim()
}
