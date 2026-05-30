import { describe, expect, it } from 'vitest'
import { renderMarkdownSync } from '$lib/markdown/index.js'
import { templateResolver } from '$lib/templates/index.js'
import {
  createDefaultImageBox,
  findAllImageBoxesInContent,
  imageFilename,
  normalizeImageBoxForRender,
  removeAllImageBoxesFromContent,
  renderImageBoxCaption,
  renderImageBoxHtml,
  replaceImageBoxInContent,
  serializeImageBox
} from '$lib/templates/imagebox-editor.js'

describe('imagebox serialization', () => {
  it('round-trips a basic image box', () => {
    const data = createDefaultImageBox()
    data.images = [
      { id: 'a', image: '/uploads/one.png', caption: 'First' },
      { id: 'b', image: '/uploads/two.png', caption: 'Second' }
    ]

    const markdown = replaceImageBoxInContent('', data.id, data)
    const matches = findAllImageBoxesInContent(markdown)

    expect(matches).toHaveLength(1)
    expect(matches[0].data.images).toHaveLength(2)
    expect(matches[0].data.images[0]).toMatchObject({
      image: '/uploads/one.png',
      caption: 'First'
    })
    expect(matches[0].data.columns).toBe(4)
  })

  it('supports multiple image boxes on one page', () => {
    const first = createDefaultImageBox()
    first.images = [{ id: 'a', image: '/uploads/a.png', caption: 'A' }]
    const second = createDefaultImageBox()
    second.images = [{ id: 'b', image: '/uploads/b.png', caption: 'B' }]

    let content = replaceImageBoxInContent('', first.id, first)
    content = replaceImageBoxInContent(`${content}\n\nBody text\n`, second.id, second)

    const matches = findAllImageBoxesInContent(content)
    expect(matches).toHaveLength(2)
    expect(matches[0].data.id).not.toBe(matches[1].data.id)
  })

  it('replaces an image box by id', () => {
    const data = createDefaultImageBox()
    data.images = [{ id: 'a', image: '/uploads/old.png', caption: 'Old' }]
    const markdown = replaceImageBoxInContent('Intro text', data.id, data)

    const updated = replaceImageBoxInContent(markdown, data.id, {
      ...data,
      images: [{ id: 'a', image: '/uploads/new.png', caption: 'New' }]
    })

    expect(updated).toContain('/uploads/new.png')
    expect(updated).not.toContain('/uploads/old.png')
  })

  it('removes all image boxes from preview content', () => {
    const data = createDefaultImageBox()
    const markdown = replaceImageBoxInContent('Before\n\nAfter', data.id, data)
    const stripped = removeAllImageBoxesFromContent(markdown)

    expect(stripped).not.toContain('{{ImageBox|')
    expect(stripped).toContain('Before')
    expect(stripped).toContain('After')
  })

  it('extracts filenames from upload URLs', () => {
    expect(imageFilename('/uploads/coat-of-arms.png')).toBe('coat-of-arms.png')
  })
})

describe('imagebox rendering', () => {
  it('renders a grid with captions', () => {
    const html = renderImageBoxHtml({
      id: 'ibtest',
      columns: 4,
      images: [
        { id: '1', image: '/uploads/a.png', caption: 'Alpha' },
        { id: '2', image: '/uploads/b.png', caption: 'Beta' }
      ]
    })

    expect(html).toContain('wiki-imagebox')
    expect(html).toContain('--imagebox-cols: 4')
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
  })

  it('renders through the markdown pipeline', () => {
    const data = createDefaultImageBox()
    data.columns = 2
    data.images = [
      { id: '1', image: '/uploads/a.png', caption: 'One' },
      { id: '2', image: '/uploads/b.png', caption: 'Two' },
      { id: '3', image: '/uploads/c.png', caption: 'Three' }
    ]

    const html = renderMarkdownSync(serializeImageBox(data), {
      templateResolver,
      wikiLinks: {}
    })

    expect(html).toContain('wiki-imagebox')
    expect(html).toContain('--imagebox-cols: 2')
    expect(html).toContain('imagebox-caption')
    expect(html).not.toContain('{{ImageBox|')
  })

  it('keeps the requested column count when captions are long', () => {
    const longCaption =
      'Nibelungen Bridge to Worms across the Rhine, showing the full span at sunset'
    const html = renderImageBoxHtml({
      id: 'iblong',
      columns: 4,
      images: [
        { id: '1', image: '/uploads/a.png', caption: longCaption },
        { id: '2', image: '/uploads/b.png', caption: 'Short' },
        { id: '3', image: '/uploads/c.png', caption: 'Also short' }
      ]
    })

    expect(html).toContain('imagebox-long-captions')
    expect(html).toContain('--imagebox-cols: 4')
    expect(html).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(html).toContain('imagebox-media')
    expect(html).toContain('<figcaption class="imagebox-caption">')
  })

  it('renders caption line breaks and paragraph gaps', () => {
    const html = renderImageBoxCaption('First line\nSecond line\n\nGap paragraph')
    expect(html).toContain('First line<br />Second line')
    expect(html).toContain('imagebox-caption-block')
    expect(html).toContain('Gap paragraph')
  })

  it('renders bold markdown in captions', () => {
    const html = renderImageBoxCaption('Latin: **Anno Domini**\n\nTranslation: plain text')
    expect(html).toContain('<strong>Anno Domini</strong>')
  })

  it('repairs multiline image box templates for rendering', () => {
    const broken =
      '{{ImageBox|@id=ibtest|columns=2|@img0=/uploads/a.png|@img0_cap=Latin:"Hello"\n\nTranslation:"World"|@order=@img0}}'
    const normalized = normalizeImageBoxForRender(broken)

    expect(normalized).not.toContain('\n')
    expect(normalized).toContain('\\n\\n')

    const html = renderMarkdownSync(normalized, { templateResolver, wikiLinks: {} })
    expect(html).toContain('wiki-imagebox')
    expect(html).not.toContain('{{ImageBox')
  })
})
