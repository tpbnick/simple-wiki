import { runOnSidebarItems } from '$lib/extensions/server.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
    sidebarItems: runOnSidebarItems([])
  }
}
