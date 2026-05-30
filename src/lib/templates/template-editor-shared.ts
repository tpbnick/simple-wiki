/** Shared order keys used by visual template editors (infobox, imagebox). */
export const TEMPLATE_ORDER_PARAM_KEYS = ['@order', '__order__', 'order'] as const

/** Returns the first configured order param from a template record. */
export function orderParamFromRecord(params: Record<string, string>): string | undefined {
  for (const key of TEMPLATE_ORDER_PARAM_KEYS) {
    const value = params[key]
    if (value) return value
  }
  return undefined
}

/** Generates a short random id for editor-owned rows/items. */
export function newEditorId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`
}
