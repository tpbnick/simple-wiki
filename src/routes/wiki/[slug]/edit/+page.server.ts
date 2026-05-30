import { redirect, fail } from '@sveltejs/kit'
import { getPage } from '$lib/db/index.js'
import { slugify, titleFromSlug } from '$lib/slug.js'
import { getEditorToolbarItems, getEditorLoadData } from '$lib/extensions/index.js'
import { requireAuthenticated, requireAuthenticatedPage } from '$lib/auth-access.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'
import { persistWikiPage } from '$lib/server/page-save.js'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = ({ params, locals, url }) => {
  requireAuthenticatedPage(locals, {
    next: `/wiki/${params.slug}/edit${url.search}`
  })

  const { slug } = params
  const page = slug === 'new' ? null : getPage(slug)
  const isNew = slug === 'new' || !page
  const titleParam = url.searchParams.get('title')?.trim() ?? ''
  const defaultNamespace = url.searchParams.get('ns') === 'template' ? 'template' : 'article'
  const defaultTitle = titleParam || (page ? '' : titleFromSlug(slug))
  const editorTools = getEditorToolbarItems()
  const editorExtensionData = getEditorLoadData(editorTools)
  const familyTrees =
    (editorExtensionData.familyTrees as Array<{ slug: string; title: string }> | undefined) ?? []

  return {
    page,
    slug,
    isNew,
    defaultNamespace,
    defaultTitle,
    editorTools,
    familyTrees
  }
}

export const actions: Actions = {
  save: async ({ request, params, locals, getClientAddress }) => {
    requireAuthenticated(locals)

    const rateLimited = enforceFormWriteRateLimit(locals, getClientAddress, 'pages-save')
    if (rateLimited) return rateLimited

    const data = await request.formData()
    const fields = {
      title: String(data.get('title') ?? '').trim(),
      content: String(data.get('content') ?? ''),
      summary: String(data.get('summary') ?? '').trim(),
      namespace: String(data.get('namespace') ?? 'article'),
      expectedUpdatedAt: String(data.get('expectedUpdatedAt') ?? '') || null
    }

    const result = persistWikiPage({
      routeSlug: params.slug,
      fields,
      requireExpectedUpdatedWhenExisting: true
    })

    if (!result.ok) {
      if (result.type === 'validation') {
        return fail(result.status, { error: result.message, ...fields })
      }
      if (result.type === 'duplicate') {
        return fail(409, {
          error: result.message,
          ...result.fields
        })
      }
      return fail(409, {
        error: result.message,
        ...result.fields,
        expectedUpdatedAt: result.expectedUpdatedAt
      })
    }

    redirect(303, `/wiki/${result.slug}`)
  }
}
