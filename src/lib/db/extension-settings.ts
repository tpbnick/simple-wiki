import { openDatabase } from './connection.js'

export function extensionEnabledMetaKey(id: string): string {
  return `extension_enabled:${id}`
}

/** Returns true when an extension is enabled (default: enabled). */
export function isExtensionEnabled(id: string): boolean {
  const raw = openDatabase().statements.getAppMeta.get(extensionEnabledMetaKey(id))?.value
  return raw !== '0'
}

/** Enables or disables an extension by stable folder id. */
export function setExtensionEnabled(id: string, enabled: boolean): void {
  const { statements } = openDatabase()
  const key = extensionEnabledMetaKey(id)

  if (enabled) {
    statements.deleteAppMeta.run(key)
    return
  }

  statements.setAppMeta.run(key, '0')
}
