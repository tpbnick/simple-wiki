import { describe, expect, it } from 'vitest'
import { buildPreviewContent } from './preview-content.js'

describe('buildPreviewContent', () => {
  it('strips infobox and imagebox blocks when requested', () => {
    const raw = [
      'Intro',
      '{{Infobox|title=Test|fields=name=Jane}}',
      '{{ImageBox|id=box1|title=Photos|images=photo.png|caption=Photo}}',
      'Outro'
    ].join('\n')

    const stripped = buildPreviewContent(raw, { stripInfobox: true, stripImageBoxes: true })
    expect(stripped).toContain('Intro')
    expect(stripped).toContain('Outro')
    expect(stripped).not.toContain('Infobox')
    expect(stripped).not.toContain('ImageBox')
  })

  it('leaves content unchanged when stripping is disabled', () => {
    const raw = '{{Infobox|title=Test|fields=name=Jane}}'
    expect(buildPreviewContent(raw, { stripInfobox: false, stripImageBoxes: false })).toBe(raw)
  })
})
