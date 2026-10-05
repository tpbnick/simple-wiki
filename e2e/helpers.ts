import type { Page } from '@playwright/test'

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'e2e-admin-password'

/** Signs in as the seeded admin, completing the first-run password change when needed. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('#username', 'admin')
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))

  if (page.url().includes('/admin/change-password')) {
    await page.fill('#new-password', ADMIN_PASSWORD)
    await page.fill('#confirm-password', ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Save password' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/change-password'))
  }
}
