import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { getBuildInfo } from './scripts/git-build-info.mjs'

const buildInfo = getBuildInfo()

/** Client builds stub the Node AsyncLocalStorage module; SSR loads the real implementation. */
function renderContextNodeStub(): Plugin {
  const stubId = '\0render-context-node-stub'
  return {
    name: 'render-context-node-stub',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (source.endsWith('render-context.node.js') && !options?.ssr) {
        return stubId
      }
    },
    load(id) {
      if (id !== stubId) return
      return `export const renderContextRunner = {
  getStore: () => ({ context: {}, templateDepth: 0 }),
  withStore: (_store, run) => run()
}`
    }
  }
}

export default defineConfig({
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo)
  },
  plugins: [renderContextNodeStub(), tailwindcss(), sveltekit()],
  ssr: {
    external: ['better-sqlite3']
  }
})
