import { getPage, getRecentPages } from '$lib/db/index.js'
import { renderWikiPage } from '$lib/wiki-render.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })
  const homePage = getPage('home')
  const recentPages = getRecentPages(6).filter((page) => page.slug !== 'home')

  let homeHtml = ''
  let toc: import('$lib/markdown/index.js').TocEntry[] = []

  if (homePage) {
    const rendered = await renderWikiPage(homePage, { canEdit: !!locals.user })
    homeHtml = rendered.html
    toc = rendered.toc
  }

  return {
    homePage,
    homeHtml,
    toc,
    recent: recentPages,
    canEdit: !!locals.user
  }
}
