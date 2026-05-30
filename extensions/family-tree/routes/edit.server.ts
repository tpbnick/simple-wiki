import { error } from '@sveltejs/kit'
import { getAllPageSlugs } from '$lib/db/pages.js'
import { requireReadAccess } from '$lib/read-access.js'
import { getFamilyTree } from '../db.js'
import type { ServerLoad } from '@sveltejs/kit'
import type { EditPageData } from './types.js'

export type { EditPageData } from './types.js'

export const load: ServerLoad = async ({ params, locals, url }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })

  const tree = getFamilyTree(params.slug!)
  if (!tree) error(404, 'Family tree not found')

  return {
    tree,
    canEdit: !!locals.user,
    existingPageSlugs: [...getAllPageSlugs()]
  } satisfies EditPageData
}
