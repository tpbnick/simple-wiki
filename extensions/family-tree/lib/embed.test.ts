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
    expect(resolveFamilyTreeParam({ slug: 'steighner' })).toBe('steighner')
  })
})

describe('renderFamilyTreeEmbed', () => {
  it('renders an inline tree with nodes and edges', () => {
    createFamilyTree('Steighner', 'steighner')

    const html = renderFamilyTreeEmbed({ family: 'steighner' })

    expect(html).toContain('wiki-family-tree-embed')
    expect(html).toContain('Steighner')
    expect(html).toContain('wiki-family-tree-embed__mount')
    expect(html).toContain('data-family="steighner"')
    expect(html).toContain('data-tree="')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('Edit tree')
    expect(html).not.toContain('Open editor')
  })

  it('shows an edit link for signed-in admins', () => {
    createFamilyTree('Steighner', 'steighner')

    const html = withRenderContext({ canEdit: true }, () =>
      renderFamilyTreeEmbed({ family: 'steighner' })
    )

    expect(html).toContain('Edit tree')
    expect(html).toContain('/family-tree/steighner')
  })

  it('does not embed wiki page slugs in HTML (loaded client-side)', () => {
    createFamilyTree('Steighner', 'steighner')
    savePage('steighner-family', 'Steighner Family', '{{FamilyTree|family=steighner}}', 'article', 'create')

    const html = renderFamilyTreeEmbed({ family: 'steighner' })

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
    createFamilyTree('Steighner', 'steighner')

    const html = renderMarkdownSync('{{FamilyTree|family=steighner}}', {
      templateResolver,
      wikiLinks: { existingPages: new Set<string>() }
    })

    expect(html).toContain('wiki-family-tree-embed')
    expect(html).toContain('data-family="steighner"')
    expect(html).not.toContain('data-tree="')
    expect(html).not.toContain('<iframe')
  })
})
