import { describe, expect, it } from 'vitest'
import { HOME_CONTENT } from '$lib/db/defaults.js'
import { renderMarkdownSync } from '$lib/markdown/index.js'
import { templateResolver } from '$lib/templates/index.js'
import {
  createDefaultInfobox,
  findInfoboxInContent,
  infoboxDataFromParams,
  moveInfoboxToTop,
  normalizeInfoboxForRender,
  renderInfoboxHtml,
  renderInfoboxInlineValue,
  replaceInfoboxInContent
} from '$lib/templates/infobox-editor.js'

describe('findInfoboxInContent', () => {
  it('ignores infobox syntax inside inline code', () => {
    const content = '| `{{Infobox|title=Name|Key=Value}}` | Example |'
    expect(findInfoboxInContent(content)).toBeNull()
  })

  it('ignores infobox syntax inside fenced code blocks', () => {
    const content = '```md\n{{Infobox|title=Name|Key=Value}}\n```'
    expect(findInfoboxInContent(content)).toBeNull()
  })

  it('does not match the home page documentation table example', () => {
    expect(findInfoboxInContent(HOME_CONTENT)).toBeNull()
  })

  it('finds a real infobox at the top of the page', () => {
    const content = '{{Infobox|title=France|Capital=Paris}}\n\nSome article text.'
    const match = findInfoboxInContent(content)
    expect(match?.data.title).toBe('France')
    expect(match?.start).toBe(0)
  })
})

describe('infobox serialization', () => {
  it('round-trips a basic infobox', () => {
    const data = createDefaultInfobox()
    data.title = 'France'
    const markdown = replaceInfoboxInContent('', data)
    const match = findInfoboxInContent(markdown)
    expect(match?.data.title).toBe('France')
    expect(match?.data.entries.length).toBeGreaterThan(0)
  })

  it('preserves multiple text rows with duplicate labels', () => {
    const data = createDefaultInfobox()
    data.entries = [
      { type: 'text', label: 'Field', value: 'First' },
      { type: 'text', label: 'Field', value: 'Second value' }
    ]

    const markdown = replaceInfoboxInContent('', data)
    const match = findInfoboxInContent(markdown)

    expect(match?.data.entries).toHaveLength(2)
    expect(match?.data.entries[0]).toMatchObject({ type: 'text', label: 'Field', value: 'First' })
    expect(match?.data.entries[1]).toMatchObject({
      type: 'text',
      label: 'Field',
      value: 'Second value'
    })
  })

  it('serializes row order with a markdown-safe @order key', () => {
    const data = createDefaultInfobox('Person')
    data.title = 'Thomas Müller'
    data.entries = [{ type: 'text', label: 'Place of Birth', value: 'Pähl' }]

    const markdown = replaceInfoboxInContent('', data)

    expect(markdown).toContain('@order=@row0')
    expect(markdown).not.toContain('__order__')
  })

  it('renders infobox HTML in reader view', () => {
    const data = createDefaultInfobox('Person')
    data.title = 'Thomas Müller'
    data.entries = [{ type: 'text', label: 'Place of Birth', value: 'Pähl' }]
    const legacyMarkdown =
      '{{Infobox Person|title=Thomas Müller|@row0_label=Place of Birth|@row0=Pähl|__order__=@row0}}'

    const html = renderMarkdownSync(normalizeInfoboxForRender(legacyMarkdown), {
      templateResolver,
      wikiLinks: {}
    })

    expect(html).toContain('wiki-infobox not-prose')
    expect(html).toContain('wiki-infobox')
    expect(html).toContain('Place of Birth')
    expect(html).toContain('Pähl')
    expect(html).not.toContain('{{Infobox')
  })

  it('parses legacy order keys mangled by markdown emphasis', () => {
    const params = {
      title: 'Thomas Müller',
      '@row0_label': 'Place of Birth',
      '@row0': 'Pähl',
      order: '@row0'
    }

    const data = infoboxDataFromParams(params, 'Infobox Person')

    expect(data.entries).toHaveLength(1)
    expect(data.entries[0]).toMatchObject({
      type: 'text',
      label: 'Place of Birth',
      value: 'Pähl'
    })
  })

  it('serializes empty text rows so new rows survive round-trip', () => {
    const data = createDefaultInfobox()
    data.entries = [
      { type: 'text', label: 'Place of Birth', value: 'Pähl' },
      { type: 'text', label: 'Field', value: '' }
    ]

    const markdown = replaceInfoboxInContent('', data)
    const match = findInfoboxInContent(markdown)

    expect(match?.data.entries).toHaveLength(2)
    expect(match?.data.entries[1]).toMatchObject({ type: 'text', label: 'Field', value: '' })
  })

  it('places infobox markdown at the top of the page', () => {
    const data = createDefaultInfobox('Person')
    data.title = 'Thomas Müller'
    const markdown = replaceInfoboxInContent('Lead paragraph.\n\n## Section', data)

    expect(markdown.startsWith('{{Infobox Person|')).toBe(true)
    expect(markdown).toContain('Lead paragraph.')
  })

  it('moves a trailing infobox to the top for reader rendering', () => {
    const content = 'Lead paragraph.\n\n{{Infobox|title=France|Capital=Paris}}'
    const normalized = moveInfoboxToTop(content)

    expect(normalized.startsWith('{{Infobox|')).toBe(true)
  })

  it('renders infobox before body text for float layout', () => {
    const data = createDefaultInfobox('Person')
    data.title = 'Thomas Müller'
    data.entries = [{ type: 'text', label: 'Place of Birth', value: 'Pähl' }]
    const markdown = normalizeInfoboxForRender(
      replaceInfoboxInContent('Lead paragraph that should wrap beside the infobox.', data)
    )

    const html = renderMarkdownSync(markdown, { templateResolver, wikiLinks: {} })
    const asideIdx = html.indexOf('<aside')
    const pIdx = html.indexOf('<p>')

    expect(asideIdx).toBeGreaterThan(-1)
    expect(asideIdx).toBeLessThan(pIdx)
  })

  it('round-trips image size as a percentage of infobox width', () => {
    const data = createDefaultInfobox('Country')
    data.title = 'Example Country'
    data.entries = [
      {
        type: 'image',
        id: 'img1',
        image: '/uploads/coat-of-arms.png',
        caption: 'Coat of arms',
        size: 45
      },
      { type: 'text', label: 'Capital', value: 'Example City' }
    ]

    const markdown = replaceInfoboxInContent('', data)
    expect(markdown).toContain('@img0_size=45')

    const match = findInfoboxInContent(markdown)
    expect(match?.data.entries[0]).toMatchObject({
      type: 'image',
      image: '/uploads/coat-of-arms.png',
      caption: 'Coat of arms',
      size: 45
    })
  })

  it('renders image size as inline width percentage', () => {
    const html = renderInfoboxHtml({
      templateName: 'Infobox Country',
      title: 'Example Country',
      entries: [
        {
          type: 'image',
          id: 'img1',
          image: '/uploads/coat-of-arms.png',
          caption: 'Coat of arms',
          size: 45
        }
      ]
    })

    expect(html).toContain('style="width: 45%; max-width: 45%"')
    expect(html).toContain('data-size="45"')
  })

  it('preserves image size through the reader markdown pipeline', () => {
    const data = createDefaultInfobox('Country')
    data.title = 'Example Country'
    data.entries = [
      {
        type: 'image',
        id: 'img1',
        image: '/uploads/coat-of-arms.png',
        caption: 'Coat of arms',
        size: 45
      }
    ]

    const html = renderMarkdownSync(replaceInfoboxInContent('', data), {
      templateResolver,
      wikiLinks: {}
    })

    expect(html).toContain('style="width: 45%; max-width: 45%"')
    expect(html).toContain('data-size="45"')
  })
})

describe('renderInfoboxInlineValue', () => {
  it('renders standard markdown links as [text](url)', () => {
    const html = renderInfoboxInlineValue('[Wikipedia](https://en.wikipedia.org/wiki/Test)')
    expect(html).toBe(
      '<a href="https://en.wikipedia.org/wiki/Test" rel="noopener noreferrer">Wikipedia</a>'
    )
  })

  it('renders markdown links inside infobox templates from the reader pipeline', () => {
    const markdown =
      '{{Infobox|title=Test|@row0_label=Wikipedia Link|@row0=[Link](https://en.wikipedia.org/wiki/Fischbach_bei_Dahn)|@order=@row0}}'
    const html = renderMarkdownSync(markdown, { templateResolver, wikiLinks: {} })

    expect(html).toContain('<a href="https://en.wikipedia.org/wiki/Fischbach_bei_Dahn">Link</a>')
  })

  it('renders bare URLs without swallowing trailing markdown', () => {
    const html = renderInfoboxHtml({
      templateName: 'Infobox',
      title: 'Test',
      entries: [
        {
          type: 'text',
          id: '1',
          label: 'Site',
          value: 'See https://example.com for details'
        }
      ]
    })

    expect(html).toContain(
      'See <a href="https://example.com" rel="noopener noreferrer">https://example.com</a> for details'
    )
  })

  it('renders wiki links to existing pages', () => {
    const html = renderInfoboxInlineValue('[[John Smith]]', {
      existingPages: new Set(['john-smith'])
    })
    expect(html).toBe('<a href="/wiki/john-smith">John Smith</a>')
  })

  it('renders wiki links with parenthetical titles', () => {
    const html = renderInfoboxInlineValue('[[Kathleen (Kathy) Steighner]]', {
      existingPages: new Set(['kathleen-kathy-steighner'])
    })
    expect(html).toBe('<a href="/wiki/kathleen-kathy-steighner">Kathleen (Kathy) Steighner</a>')
  })

  it('marks missing wiki pages as red links', () => {
    const html = renderInfoboxInlineValue('[[Missing Person]]', {
      existingPages: new Set(['home'])
    })
    expect(html).toBe(
      '<a href="/wiki/missing-person?title=Missing%20Person" class="redlink">Missing Person</a>'
    )
  })

  it('renders wiki links inside infobox templates from the reader pipeline', () => {
    const markdown = '{{Infobox|title=Test|@row0_label=Spouse|@row0=[[John Smith]]|@order=@row0}}'
    const html = renderMarkdownSync(markdown, {
      templateResolver,
      wikiLinks: { existingPages: new Set(['john-smith']) }
    })

    expect(html).toContain('<a href="/wiki/john-smith">John Smith</a>')
  })
})
