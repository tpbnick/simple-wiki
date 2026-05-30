import { getPage } from '$lib/db/index.js'
import { renderWikiPage } from '$lib/wiki-render.js'
import { titleFromSlug } from '$lib/slug.js'
import { requireReadAccess } from '$lib/read-access.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  requireReadAccess(locals, { redirect: true, next: url.pathname })

  const { slug } = params
  const titleParam = url.searchParams.get('title')?.trim() ?? ''

  if (slug === 'new') {
    return {
      page: null,
      slug,
      suggestedTitle: titleParam || 'New page',
      html: '',
      toc: [],
      canEdit: !!locals.user
    }
  }

  const page = getPage(slug)
  if (!page) {
    return {
      page: null,
      slug,
      suggestedTitle: titleParam || titleFromSlug(slug),
      html: '',
      toc: [],
      canEdit: !!locals.user
    }
  }

  const { html, toc } = await renderWikiPage(page, { canEdit: !!locals.user })

  return { page, slug, suggestedTitle: page.title, html, toc, canEdit: !!locals.user }
}
