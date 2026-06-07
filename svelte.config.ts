import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import type { Config } from '@sveltejs/kit'

const config: Config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: 'build'
    }),
    alias: {
      $lib: 'src/lib',
      $extensions: 'extensions'
    },
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        // Shiki uses Oniguruma WASM for syntax highlighting in the client-side editor preview.
        'script-src': ['self', 'wasm-unsafe-eval'],
        'style-src': ['self', 'unsafe-inline', 'https://fonts.bunny.net'],
        'img-src': ['self', 'data:', 'blob:'],
        'font-src': ['self', 'https://fonts.bunny.net'],
        'connect-src': ['self'],
        'frame-ancestors': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
}

export default config
