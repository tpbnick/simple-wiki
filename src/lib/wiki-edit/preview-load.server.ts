import { getAllPageSlugs, getPagesByNamespace } from '$lib/db/index.js'
import {
  getDisabledExtensions,
  getEditorPreviewBundleData,
  getEnabledExtensionIds
} from '$lib/extensions/index.js'
import type { EditorPreviewBundle } from './client-preview.js'

/** Loads slug, template, and extension preview data for client-side editor preview. */
export function loadEditorPreviewBundle(): EditorPreviewBundle {
  const templatePages = Object.fromEntries(
    getPagesByNamespace('template').map((page) => [page.slug, page.content])
  )

  return {
    existingSlugs: [...getAllPageSlugs()],
    templatePages,
    extensionData: getEditorPreviewBundleData(),
    enabledExtensionIds: getEnabledExtensionIds(),
    disabledExtensions: getDisabledExtensions()
  }
}
