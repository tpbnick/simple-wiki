import { listFamilyTrees } from '../db.js'
import { requireReadAccess } from '$lib/read-access.js'
import { enforceReadRateLimit } from '$lib/read-rate-limit.js'
import type { ServerLoad } from '@sveltejs/kit'
import type { ListPageData } from './types.js'

export type { ListPageData } from './types.js'

export const load: ServerLoad = async ({ locals, url, getClientAddress }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })
  enforceReadRateLimit(getClientAddress, 'family-tree-list')

  return {
    trees: listFamilyTrees(),
    canEdit: !!locals.user
  } satisfies ListPageData
}
