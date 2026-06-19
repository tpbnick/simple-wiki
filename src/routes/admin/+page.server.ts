import { fail } from '@sveltejs/kit'
import {
  countContentPages,
  getAllUploads,
  getPageSummaries,
  getRecentRevisions,
  getRevisionRetentionLimit,
  listUsers,
  createWikiUser,
  searchContentPageSummaries
} from '$lib/db/index.js'
import { getExtensions, isExtensionEnabled } from '$lib/extensions/index.js'
import { hashPasswordAsync, generatePassword } from '$lib/auth.js'
import { getAppVersion, getWikiName } from '$lib/wiki-identity.js'
import { requireAdminPage } from '$lib/admin-access.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'
import { handleRevisionRetentionAction } from '$lib/server/revision-retention-action.js'
import { handleExtensionToggleAction } from '$lib/server/extension-toggle-action.js'
import type { PageServerLoad, Actions } from './$types'

const ADMIN_PAGES_PAGE_SIZE = 100

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdminPage(locals, { next: '/admin' })

  const tab = url.searchParams.get('tab') ?? 'pages'
  const contentPageCount = countContentPages()
  const pagesQuery = (url.searchParams.get('pagesQ') ?? '').trim()
  const pagesPage = Math.max(1, Number(url.searchParams.get('pagesPage') ?? '1') || 1)

  const pagesResult =
    tab === 'pages'
      ? searchContentPageSummaries({
          query: pagesQuery,
          limit: ADMIN_PAGES_PAGE_SIZE,
          offset: (pagesPage - 1) * ADMIN_PAGES_PAGE_SIZE
        })
      : { pages: [], total: contentPageCount }

  const uploads = getAllUploads()
  const recent = getRecentRevisions(100)
  const revisionRetention = getRevisionRetentionLimit()
  const templates = getPageSummaries('template')
  const users = listUsers()
  const extensions = getExtensions().map((e) => ({
    id: e.id ?? '',
    name: e.name,
    version: e.version,
    description: e.description ?? '',
    manageHref: e.manageHref ?? null,
    enabled: e.id ? isExtensionEnabled(e.id) : true
  }))

  return {
    pages: pagesResult.pages,
    pagesTotal: pagesResult.total,
    pagesQuery,
    pagesPage,
    pagesPageSize: ADMIN_PAGES_PAGE_SIZE,
    contentPageCount,
    uploads,
    recent,
    revisionRetention,
    templates,
    users,
    extensions,
    tab,
    wikiName: getWikiName(),
    appVersion: getAppVersion()
  }
}

export const actions: Actions = {
  createUser: async ({ request, locals, getClientAddress }) => {
    requireAdminPage(locals, { next: '/admin?tab=users' })

    const rateLimited = enforceFormWriteRateLimit(locals, getClientAddress, 'admin-create-user', {
      field: 'userError',
      tab: 'users'
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const username = String(formData.get('username') ?? '').trim()
    const isAdmin = formData.get('isAdmin') === 'on'

    if (!username) {
      return fail(400, { userError: 'Username is required', tab: 'users' })
    }

    if (!/^[a-z0-9_-]{2,32}$/i.test(username)) {
      return fail(400, {
        userError: 'Username must be 2–32 characters (letters, numbers, _ or -)',
        tab: 'users'
      })
    }

    try {
      const password = generatePassword(14)
      createWikiUser(username, await hashPasswordAsync(password), {
        mustChangePw: 1,
        isAdmin: isAdmin ? 1 : 0
      })
      return {
        userCreated: { username, password },
        tab: 'users'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create user'
      return fail(409, { userError: message, tab: 'users' })
    }
  },

  updateRevisionRetention: async ({ request, locals, getClientAddress }) => {
    requireAdminPage(locals, { next: '/admin?tab=recent' })

    return handleRevisionRetentionAction(await request.formData(), locals, getClientAddress, {
      tab: 'recent'
    })
  },

  toggleExtension: async ({ request, locals, getClientAddress }) => {
    requireAdminPage(locals, { next: '/admin?tab=extensions' })

    return handleExtensionToggleAction(await request.formData(), locals, getClientAddress)
  }
}
