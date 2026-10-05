import { extensionIdFromGlobPath } from './client-id.js'
import { renderExtensionDisabledHtml } from './disabled-message.js'

const templateModules = import.meta.glob<{
  renderPreviewTemplate?: (
    name: string,
    params: Record<string, string>,
    extensionData: Record<string, unknown>,
    canEdit: boolean
  ) => string | null
}>('../../../extensions/*/lib/preview-template.ts', { eager: true })

/** Client-side {{Template}} handlers contributed by enabled extensions. */
export function runClientTemplateParse(
  name: string,
  params: Record<string, string>,
  extensionData: Record<string, unknown>,
  canEdit: boolean,
  enabledIds: Iterable<string>,
  disabledExtensions: Array<{ id: string; name: string; templates: string[] }> = []
): string | null {
  const allowed = new Set(enabledIds)
  const disabledById = new Map(
    disabledExtensions.map((extension) => [extension.id, extension.name])
  )

  for (const [path, module] of Object.entries(templateModules)) {
    const id = extensionIdFromGlobPath(path)
    if (!id || !allowed.has(id)) continue
    const result = module.renderPreviewTemplate?.(name, params, extensionData, canEdit)
    if (result != null) return result
  }

  for (const [path, module] of Object.entries(templateModules)) {
    const id = extensionIdFromGlobPath(path)
    const extensionName = id ? disabledById.get(id) : undefined
    if (!extensionName) continue
    const result = module.renderPreviewTemplate?.(name, params, extensionData, canEdit)
    if (result != null) return renderExtensionDisabledHtml(extensionName)
  }

  return null
}
