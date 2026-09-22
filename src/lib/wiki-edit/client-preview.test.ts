import { describe, expect, it } from 'vitest'
import { createEmptyTree } from '../../../extensions/family-tree/lib/model.js'
import { renderEditorPreview } from './client-preview.js'
import type { EditorPreviewBundle } from './client-preview.js'

function previewBundle(overrides: Partial<EditorPreviewBundle> = {}): EditorPreviewBundle {
  return {
    existingSlugs: ['home', 'about'],
    templatePages: {},
    extensionData: {},
    enabledExtensionIds: [],
    disabledExtensions: [],
    ...overrides
  }
}

describe('renderEditorPreview', { timeout: 15_000 }, () => {
  it('renders markdown with wiki links without a server round-trip', async () => {
    const html = await renderEditorPreview('See [[about]] and [[missing]].', previewBundle(), {
      stripInfobox: false,
      stripImageBoxes: false
    })

    expect(html).toContain('href="/wiki/about"')
    expect(html).toContain('redlink')
  })

  it('strips infobox markdown when the visual infobox editor is active', async () => {
    const html = await renderEditorPreview('{{Infobox|name=Test}}\n\nBody text', previewBundle(), {
      stripInfobox: true,
      stripImageBoxes: false
    })

    expect(html).not.toContain('Infobox')
    expect(html).toContain('Body text')
  })

  it('says the extension is disabled instead of rendering a family tree', async () => {
    const html = await renderEditorPreview(
      '{{FamilyTree|family=missing-tree}}',
      previewBundle({
        disabledExtensions: [{ id: 'family-tree', name: 'Family Tree', templates: ['FamilyTree'] }]
      }),
      {
        stripInfobox: false,
        stripImageBoxes: false
      }
    )

    expect(html).toContain('Family Tree extension is disabled - enable in admin settings')
    expect(html).not.toContain('wiki-family-tree-embed')
    expect(html).not.toContain('Family tree not found')
  })

  it('renders family tree template errors when the slug is missing', async () => {
    const html = await renderEditorPreview(
      '{{FamilyTree|family=missing-tree}}',
      previewBundle({ enabledExtensionIds: ['family-tree'] }),
      {
        stripInfobox: false,
        stripImageBoxes: false
      }
    )

    expect(html).toContain('Family tree not found')
  })

  it('renders a family tree embed from preview bundle data', async () => {
    const data = createEmptyTree('Smith')
    const html = await renderEditorPreview(
      '{{FamilyTree|family=smith}}',
      previewBundle({
        enabledExtensionIds: ['family-tree'],
        extensionData: { familyTrees: { smith: { title: 'Smith', data } } }
      }),
      {
        stripInfobox: false,
        stripImageBoxes: false
      }
    )

    expect(html).toContain('wiki-family-tree-embed')
    expect(html).toContain('data-family="smith"')
  })
})
