import { error, redirect } from '@sveltejs/kit'
import { isPublicReadEnabled } from '$lib/env.js'

/** Requires login for read access when the wiki is in private mode (PUBLIC_READ=false). */
export function requireReadAccess(
  locals: App.Locals,
  options: { redirect?: boolean; next?: string } = {}
): void {
  if (isPublicReadEnabled()) return
  if (locals.user) return

  if (options.redirect) {
    const next = options.next ?? '/'
    redirect(303, `/login?next=${encodeURIComponent(next)}`)
  }

  error(401, 'Unauthorized')
}
