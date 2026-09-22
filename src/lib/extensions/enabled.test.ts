import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '$lib/db/connection.js'
import { setExtensionEnabled } from '$lib/db/extension-settings.js'
import {
  findDisabledExtensionForPath,
  getEditorPreviewBundleData,
  getEditorToolbarItems,
  getEnabledExtensionIds,
  getExtensions,
  loadExtensions,
  resetExtensionsForTests,
  runOnTemplateParse
} from '$lib/extensions/server.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('extension-enabled-test-')

beforeEach(() => {
  resetExtensionsForTests()
  openDatabase()
  loadExtensions()
})

describe('enabled extensions', () => {
  it('assigns stable ids from extension folders', () => {
    const familyTree = getExtensions().find((extension) => extension.name === 'Family Tree')
    expect(familyTree?.id).toBe('family-tree')
  })

  it('skips hooks for disabled extensions', () => {
    setExtensionEnabled('family-tree', false)

    expect(runOnTemplateParse('FamilyTree', { family: 'demo' })).toContain(
      'Family Tree extension is disabled - enable in admin settings'
    )
    expect(getEditorToolbarItems().some((tool) => tool.id === 'family-tree')).toBe(false)
    expect(getEditorPreviewBundleData().familyTrees).toBeUndefined()
    expect(getEnabledExtensionIds()).not.toContain('family-tree')
  })

  it('includes family-tree in enabled ids by default', () => {
    expect(getEnabledExtensionIds()).toContain('family-tree')
    expect(getEditorToolbarItems().some((tool) => tool.extensionId === 'family-tree')).toBe(true)
  })

  it('blocks routes for disabled extensions', () => {
    setExtensionEnabled('family-tree', false)

    expect(findDisabledExtensionForPath('/family-tree')?.id).toBe('family-tree')
    expect(findDisabledExtensionForPath('/family-tree/demo')?.id).toBe('family-tree')
    expect(findDisabledExtensionForPath('/api/family-tree/demo')?.id).toBe('family-tree')
    expect(findDisabledExtensionForPath('/wiki/home')).toBeNull()
  })
})
