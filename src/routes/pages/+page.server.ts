import { getPageSummaries } from '$lib/db/index.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })

  const ns = url.searchParams.get('ns') ?? 'article'
  const pages = getPageSummaries(ns)
  return { pages, ns }
}
