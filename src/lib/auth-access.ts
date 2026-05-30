import { error, redirect } from '@sveltejs/kit'

/** Requires any authenticated user for API routes. */
export function requireAuthenticated(locals: App.Locals): void {
  if (!locals.user) error(401, 'Unauthorized')
}

/** Requires an authenticated user for page loads (redirects when not signed in). */
export function requireAuthenticatedPage(
  locals: App.Locals,
  options: { next?: string } = {}
): void {
  if (!locals.user) {
    const next = options.next ?? '/'
    redirect(303, `/login?next=${encodeURIComponent(next)}`)
  }
}
