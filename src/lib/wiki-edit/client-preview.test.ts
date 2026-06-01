import { describe, expect, it } from 'vitest'
import { renderEditorPreview } from './client-preview.js'
import type { EditorPreviewBundle } from './client-preview.js'

const bundle: EditorPreviewBundle = {
  existingSlugs: ['home', 'about'],
  templatePages: {},
  familyTrees: {}
}

describe('renderEditorPreview', () => {
  it('renders markdown with wiki links without a server round-trip', async () => {
    const html = await renderEditorPreview('See [[about]] and [[missing]].', bundle, {
      stripInfobox: false,
      stripImageBoxes: false
    })

    expect(html).toContain('href="/wiki/about"')
    expect(html).toContain('redlink')
  })

  it('strips infobox markdown when the visual infobox editor is active', async () => {
    const html = await renderEditorPreview('{{Infobox|name=Test}}\n\nBody text', bundle, {
      stripInfobox: true,
      stripImageBoxes: false
    })

    expect(html).not.toContain('Infobox')
    expect(html).toContain('Body text')
  })

  it('renders family tree template errors when the slug is missing', async () => {
    const html = await renderEditorPreview('{{FamilyTree|family=missing-tree}}', bundle, {
      stripInfobox: false,
      stripImageBoxes: false
    })

    expect(html).toContain('Family tree not found')
  })
})
