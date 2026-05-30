import { describe, expect, it } from 'vitest'
import { escapeHtml } from '$lib/html.js'

describe('template-missing escaping', () => {
  it('escapes malicious template source for title attributes', () => {
    const rawTemplate = 'Evil"|onclick=alert(1)'
    const html = `<span class="template-missing" title="Template not found">{{${escapeHtml(rawTemplate)}}}</span>`

    expect(html).toContain(escapeHtml(rawTemplate))
    expect(html).not.toContain('onclick=alert(1)"')
  })
})
