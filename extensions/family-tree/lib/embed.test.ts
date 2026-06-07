import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabaseConnection, savePage } from '$lib/db/index.js'
import { loadExtensions, resetExtensionsForTests } from '$lib/extensions/index.js'
import { createFamilyTree, resetFamilyTreeDbCache } from '../db.js'
import { renderFamilyTreeEmbed, resolveFamilyTreeParam } from './embed.js'
import { renderMarkdownSync } from '$lib/markdown/index.js'
import { withRenderContext } from '$lib/markdown/render-context.js'
import { templateResolver } from '$lib/templates/index.js'

let tempDir = ''
let originalDatabasePath: string | undefined

beforeEach(async () => {
  resetDatabaseConnection()
  resetExtensionsForTests()
  resetFamilyTreeDbCache()
  originalDatabasePath = process.env.DATABASE_PATH
  tempDir = mkdtempSync(join(tmpdir(), 'wiki-family-tree-embed-'))
  process.env.DATABASE_PATH = join(tempDir, 'test.db')
  loadExtensions()
})

afterEach(() => {
  resetDatabaseConnection()
  resetFamilyTreeDbCache()
  rmSync(tempDir, { recursive: true, force: true })
  process.env.DATABASE_PATH = originalDatabasePath
})

describe('resolveFamilyTreeParam', () => {
  it('prefers family over slug', () => {
    expect(resolveFamilyTreeParam({ family: 'smith', slug: 'other' })).toBe('smith')
  })

  it('falls back to slug for legacy embeds', () => {
    expect(resolveFamilyTreeParam({ slug: 'legacy-tree' })).toBe('legacy-tree')
  })
})

describe('renderFamilyTreeEmbed', () => {
  it('renders an inline tree with nodes and edges', () => {
    createFamilyTree('Example Family', 'example-family')

    const html = renderFamilyTreeEmbed({ family: 'example-family' })

    expect(html).toContain('wiki-family-tree-embed')
    expect(html).toContain('Example Family')
    expect(html).toContain('wiki-family-tree-embed__mount')
    expect(html).toContain('data-family="example-family"')
    expect(html).toContain('data-tree="')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('Edit tree')
    expect(html).not.toContain('Open editor')
  })

  it('shows an edit link for signed-in admins', () => {
    createFamilyTree('Example Family', 'example-family')

    const html = withRenderContext({ canEdit: true }, () =>
      renderFamilyTreeEmbed({ family: 'example-family' })
    )

    expect(html).toContain('Edit tree')
    expect(html).toContain('/family-tree/example-family')
  })

  it('does not embed wiki page slugs in HTML (loaded client-side)', () => {
    createFamilyTree('Example Family', 'example-family')
    savePage(
      'example-family-page',
      'Example Family Page',
      '{{FamilyTree|family=example-family}}',
      'article',
      'create'
    )

    const html = renderFamilyTreeEmbed({ family: 'example-family' })

    expect(html).not.toContain('data-wiki-pages')
  })

  it('renders a red error when the family parameter is missing', () => {
    const html = renderFamilyTreeEmbed({})

    expect(html).toContain('wiki-family-tree-error')
    expect(html).toContain('Missing family parameter')
  })

  it('renders a red error when the tree does not exist', () => {
    const html = renderFamilyTreeEmbed({ family: 'missing-tree' })

    expect(html).toContain('wiki-family-tree-error')
    expect(html).toContain('Family tree not found')
  })

  it('survives wiki sanitization in the reader pipeline', () => {
    createFamilyTree('Example Family', 'example-family')

    const html = renderMarkdownSync('{{FamilyTree|family=example-family}}', {
      templateResolver,
      wikiLinks: { existingPages: new Set<string>() }
    })

    expect(html).toContain('wiki-family-tree-embed')
    expect(html).toContain('data-family="example-family"')
    expect(html).not.toContain('data-tree="')
    expect(html).not.toContain('<iframe')
  })
})
