import { fail } from '@sveltejs/kit'
import { setExtensionEnabled } from '$lib/db/index.js'
import { getExtensions, isExtensionEnabled } from '$lib/extensions/server.js'
import { enforceFormWriteRateLimit } from '$lib/server/form-rate-limit.js'

export interface ExtensionToggleActionResult {
  tab: 'extensions'
  extensionToggled: { id: string; enabled: boolean }
}

export interface ExtensionToggleActionFailure {
  tab: 'extensions'
  extensionError: string
}

/** Toggles an extension on or off from the admin Extensions tab. */
export function handleExtensionToggleAction(
  formData: FormData,
  locals: App.Locals,
  getClientAddress: () => string
) {
  const rateLimited = enforceFormWriteRateLimit(locals, getClientAddress, 'extension-toggle', {
    field: 'extensionError',
    tab: 'extensions'
  })
  if (rateLimited) return rateLimited

  const id = String(formData.get('extensionId') ?? '').trim()
  if (!id) {
    return fail(400, { extensionError: 'Extension id is required', tab: 'extensions' })
  }

  const extension = getExtensions().find((entry) => entry.id === id)
  if (!extension) {
    return fail(404, { extensionError: 'Unknown extension', tab: 'extensions' })
  }

  const enabled = !isExtensionEnabled(id)
  setExtensionEnabled(id, enabled)

  return {
    tab: 'extensions' as const,
    extensionToggled: { id, enabled }
  }
}
