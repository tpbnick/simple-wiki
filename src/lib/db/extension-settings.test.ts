import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '$lib/db/connection.js'
import {
  extensionEnabledMetaKey,
  isExtensionEnabled,
  setExtensionEnabled
} from '$lib/db/extension-settings.js'
import { installTempWikiEnv } from '$lib/test/db-env.js'

installTempWikiEnv('extension-settings-test-')

beforeEach(() => {
  openDatabase()
})

describe('extension settings', () => {
  it('defaults extensions to enabled', () => {
    expect(isExtensionEnabled('family-tree')).toBe(true)
  })

  it('persists disabled state in app_meta', () => {
    setExtensionEnabled('family-tree', false)

    expect(isExtensionEnabled('family-tree')).toBe(false)
    expect(openDatabase().statements.getAppMeta.get(extensionEnabledMetaKey('family-tree'))?.value).toBe(
      '0'
    )
  })

  it('clears disabled state when re-enabled', () => {
    setExtensionEnabled('family-tree', false)
    setExtensionEnabled('family-tree', true)

    expect(isExtensionEnabled('family-tree')).toBe(true)
    expect(openDatabase().statements.getAppMeta.get(extensionEnabledMetaKey('family-tree'))).toBeUndefined()
  })
})
