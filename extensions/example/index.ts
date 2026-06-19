import type { WikiExtension } from '../../src/lib/extensions/types.js'
import { escapeHtml } from '../../src/lib/html.js'

// Example extension — copy this folder into extensions/<name>/ as index.ts.
// Extensions run trusted code at startup; only install extensions you wrote or fully trust.
const extension: WikiExtension = {
  name: 'Example Extension',
  version: '1.0.0',
  description: 'Demonstrates the extension API',

  hooks: {
    onSidebarItems(items) {
      return [
        ...items,
        { label: 'Example extension loaded successfully', href: '/wiki/example', external: false }
      ]
    },

    onTemplateParse(name, params) {
      if (name !== 'Counter') return null
      const start = Number(params.start ?? 1)
      return `<span class="badge badge-primary">Count: ${escapeHtml(String(Number.isFinite(start) ? start : 1))}</span>`
    }
  }
}

export default extension
