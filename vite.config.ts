import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { getBuildInfo } from './scripts/git-build-info.mjs'

const buildInfo = getBuildInfo()

export default defineConfig({
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo)
  },
  plugins: [tailwindcss(), sveltekit()],
  ssr: {
    external: ['better-sqlite3']
  }
})
