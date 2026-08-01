import { fail } from '@sveltejs/kit'
import {
  countContentPages,
  countPagesByNamespace,
  countRevisions,
  countUploads,
  countUsers,
  createWikiUser,
  deleteWikiUser,
  getAllUploads,
  getPageSummaries,
  getRecentRevisions,
  getRevisionRetentionLimit,
  getUploadsTotalBytes,
  listUsers,
  searchContentPageSummaries,
  setWikiUserAdmin
} from '$lib/db/index.js'
import { getExtensions, isExtensionEnabled } from '$lib/extensions/index.js'
import { hashPasswordAsync, generatePassword } from '$lib/auth.js'
import { getAppVersion, getWikiName } from '$lib/wiki-identity.js'
import { requireAdminPage } from '$lib/admin-access.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'
import { handleRevisionRetentionAction } from '$lib/server/revision-retention-action.js'
import { handleExtensionToggleAction } from '$lib/server/extension-toggle-action.js'
import type { PageServerLoad, Actions, RequestEvent } from './$types'

const ADMIN_PAGES_PAGE_SIZE = 100

function userActionGuard(event: RequestEvent, label: string) {
  requireAdminPage(event.locals, { next: '/admin?tab=users' })
  return enforceFormWriteRateLimit(event.locals, event.getClientAddress, label, {
    field: 'userError',
    tab: 'users'
  })
}

function readUserId(formData: FormData): number | null {
  const userId = Number(formData.get('userId'))
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

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
  const extensions = getExtensions()

  return {
    pages: pagesResult.pages,
    pagesTotal: pagesResult.total,
    pagesQuery,
    pagesPage,
    pagesPageSize: ADMIN_PAGES_PAGE_SIZE,
    contentPageCount,
    uploadCount: countUploads(),
    uploadsTotalBytes: getUploadsTotalBytes(),
    uploads: tab === 'files' || tab === 'backups' ? getAllUploads() : [],
    recent: tab === 'recent' ? getRecentRevisions(100) : [],
    recentCount: countRevisions(),
    revisionRetention: tab === 'recent' ? getRevisionRetentionLimit() : null,
    templates: tab === 'templates' ? getPageSummaries('template') : [],
    templateCount: countPagesByNamespace('template'),
    users: tab === 'users' ? listUsers() : [],
    userCount: countUsers(),
    extensions:
      tab === 'extensions'
        ? extensions.map((e) => ({
            id: e.id ?? '',
            name: e.name,
            version: e.version,
            description: e.description ?? '',
            manageHref: e.manageHref ?? null,
            enabled: e.id ? isExtensionEnabled(e.id) : true
          }))
        : [],
    extensionCount: extensions.length,
    tab,
    wikiName: getWikiName(),
    appVersion: getAppVersion()
  }
}

export const actions: Actions = {
  createUser: async (event) => {
    const rateLimited = userActionGuard(event, 'admin-create-user')
    if (rateLimited) return rateLimited

    const formData = await event.request.formData()
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
      return { userCreated: { username, password }, tab: 'users' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create user'
      return fail(409, { userError: message, tab: 'users' })
    }
  },

  deleteUser: async (event) => {
    const rateLimited = userActionGuard(event, 'admin-delete-user')
    if (rateLimited) return rateLimited

    const userId = readUserId(await event.request.formData())
    if (!userId) return fail(400, { userError: 'Invalid user', tab: 'users' })
    if (userId === event.locals.user?.id) {
      return fail(400, { userError: 'You cannot delete your own account', tab: 'users' })
    }

    try {
      deleteWikiUser(userId)
      return { userDeleted: true, tab: 'users' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete user'
      return fail(400, { userError: message, tab: 'users' })
    }
  },

  setUserAdmin: async (event) => {
    const rateLimited = userActionGuard(event, 'admin-set-user-admin')
    if (rateLimited) return rateLimited

    const formData = await event.request.formData()
    const userId = readUserId(formData)
    if (!userId) return fail(400, { userError: 'Invalid user', tab: 'users' })

    try {
      setWikiUserAdmin(userId, formData.get('isAdmin') === '1')
      return { userUpdated: true, tab: 'users' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update user'
      return fail(400, { userError: message, tab: 'users' })
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
