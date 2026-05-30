import { error, redirect } from '@sveltejs/kit'

/**
 * Requires an authenticated admin user for admin pages and `/api/admin/*`.
 * Signed-in editors can still edit wiki content outside the admin panel.
 */
export function requireAdmin(locals: App.Locals): void {
  if (!locals.user) error(401, 'Unauthorized')
  if (!locals.user.isAdmin) error(403, 'Admin access required')
}

/** Requires an authenticated admin user for admin pages (redirects when not signed in). */
export function requireAdminPage(locals: App.Locals, options: { next?: string } = {}): void {
  if (!locals.user) {
    const next = options.next ?? '/admin'
    redirect(303, `/login?next=${encodeURIComponent(next)}`)
  }
  if (!locals.user.isAdmin) error(403, 'Admin access required')
}
