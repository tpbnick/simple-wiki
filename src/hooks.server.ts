import { resolveSession, touchSession } from '$lib/db/index.js'
import { loadExtensions } from '$lib/extensions/server.js'
import { validateServerEnv } from '$lib/env.js'
import { SESSION_COOKIE_NAME } from '$lib/auth.js'
import {
  isPasswordChangeAllowedApi,
  isPasswordChangeAllowedPage,
  requiresLoginForWrite
} from '$lib/auth-guards.js'
import { applySecurityHeaders } from '$lib/security-headers.js'
import { applyReadingPrefsHtmlShell } from '$lib/reading-prefs.js'
import { applyWikiHtmlShell, resolveWikiTheme, WIKI_THEME_COOKIE } from '$lib/wiki-theme.js'
import { isDatabaseSwapInProgress } from '$lib/db/swap-lock.js'
import { databaseSwapInProgressHtml, prefersHtmlResponse } from '$lib/server/swap-response.js'
import { redirect, type Handle } from '@sveltejs/kit'

// Validate paths before extensions open the database on startup.
if (!import.meta.env.VITEST) {
  validateServerEnv()
}

// Bundled extensions are compiled at build time and initialized before request handling.
loadExtensions()

/**
 * Resolves the session, loads extensions, and guards admin write routes.
 */
export const handle: Handle = async ({ event, resolve }) => {
  if (isDatabaseSwapInProgress()) {
    if (prefersHtmlResponse(event.request, event.url.pathname)) {
      return applySecurityHeaders(
        new Response(databaseSwapInProgressHtml(), {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '5'
          }
        })
      )
    }

    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Database restore in progress' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '5' }
      })
    )
  }

  const sessionId = event.cookies.get(SESSION_COOKIE_NAME)

  if (sessionId) {
    const user = resolveSession(sessionId)
    if (user) {
      event.locals.user = user
      touchSession(sessionId)

      if (user.mustChangePw && !event.url.pathname.startsWith('/api')) {
        const pathname = event.url.pathname
        const method = event.request.method

        if (!isPasswordChangeAllowedPage(pathname, method)) {
          redirect(303, '/admin/change-password')
        }
      }
    } else {
      event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' })
    }
  }

  const method = event.request.method
  const pathname = event.url.pathname

  if (
    event.locals.user?.mustChangePw &&
    pathname.startsWith('/api') &&
    !isPasswordChangeAllowedApi(pathname)
  ) {
    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Password change required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }

  if (pathname.startsWith('/api/admin')) {
    if (!event.locals.user) {
      return applySecurityHeaders(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }
    if (!event.locals.user.isAdmin) {
      return applySecurityHeaders(
        new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }
  }

  if (requiresLoginForWrite(pathname, method)) {
    if (!event.locals.user) {
      if (pathname.startsWith('/api')) {
        return applySecurityHeaders(
          new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }

      redirect(303, `/login?next=${encodeURIComponent(pathname)}`)
    }
  }

  const theme = resolveWikiTheme(event.cookies.get(WIKI_THEME_COOKIE))

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      applyReadingPrefsHtmlShell(applyWikiHtmlShell(html, theme), event.cookies)
  })
  return applySecurityHeaders(response)
}
