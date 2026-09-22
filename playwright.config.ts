import { mkdirSync, rmSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const adminPassword = process.env.ADMIN_PASSWORD ?? 'e2e-admin-password'
const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === '1'

rmSync('e2e/.data', { recursive: true, force: true })
mkdirSync('e2e/.data/uploads', { recursive: true })

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    // Local: system Chrome. CI installs Playwright Chromium.
    channel: process.env.CI ? undefined : 'chrome',
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: skipBuild ? 'bun run start' : 'bun run build && bun run start',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_PATH: 'e2e/.data/wiki.db',
      UPLOADS_DIR: 'e2e/.data/uploads',
      ADMIN_PASSWORD: adminPassword,
      COOKIE_SECURE: 'false',
      HOST: '127.0.0.1',
      PORT: '4173'
    }
  }
})
