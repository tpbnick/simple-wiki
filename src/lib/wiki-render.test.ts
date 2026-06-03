import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensions, resetExtensionsForTests } from '$lib/extensions/index.js'
import { createFamilyTree, resetFamilyTreeDbCache } from '../../extensions/family-tree/db.js'
import { renderWikiPage } from '$lib/wiki-render.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('wiki-render-test-')

beforeEach(() => {
  resetExtensionsForTests()
  resetFamilyTreeDbCache()
  loadExtensions()
})

afterEach(() => {
  resetFamilyTreeDbCache()
})

describe('renderWikiPage', () => {
  it(
    'preserves family tree embeds through extension and re-sanitize passes',
    { timeout: 10_000 },
    async () => {
      createFamilyTree('Example Family', 'example-family')

      const { html } = await renderWikiPage({
        id: 1,
        slug: 'demo',
        title: 'Demo',
        content: '{{FamilyTree|family=example-family}}',
        namespace: 'article',
        created_at: '',
        updated_at: ''
      })

      expect(html).toContain('wiki-family-tree-embed')
      expect(html).toContain('data-family="example-family"')
      expect(html).not.toContain('data-tree="')
      expect(html).not.toContain('<script')
    }
  )
})
