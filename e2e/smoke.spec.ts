import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers.js'

test.describe.configure({ mode: 'serial' })

test('home page loads for visitors', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('login, edit, save, and history', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/wiki/home/edit')
  await expect(page.locator('#page-title')).toHaveValue('Welcome')

  const marker = `e2e-edit-${Date.now()}`
  await page.locator('#wiki-edit-content').fill(`Updated by smoke test.\n\n${marker}`)
  await page.locator('#edit-summary').fill('e2e smoke save')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.waitForURL('**/wiki/home')
  await expect(page.getByText(marker)).toBeVisible()

  await page.goto('/wiki/home/history')
  await expect(page.getByRole('heading', { name: 'Revision History' })).toBeVisible()
  await expect(page.getByText('e2e smoke save')).toBeVisible()
})

test('invalid login is rejected', async ({ page }) => {
  await page.goto('/login')
  await page.fill('#username', 'admin')
  await page.fill('#password', 'not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid username or password')
})

test('anonymous edit redirects to login', async ({ page }) => {
  await page.goto('/wiki/home/edit')
  await expect(page).toHaveURL(/\/login/)
})

test('sign out returns to a public home page', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await page.goto('/wiki/home/edit')
  await expect(page).toHaveURL(/\/login/)
})
