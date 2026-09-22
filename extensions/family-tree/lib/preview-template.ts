import { renderFamilyTreeEmbedClient, type FamilyTreePreviewRecord } from './embed-client.js'

function isPreviewRecord(value: unknown): value is FamilyTreePreviewRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<FamilyTreePreviewRecord>
  return typeof record.title === 'string' && typeof record.data === 'object' && record.data != null
}

/** Client editor preview for {{FamilyTree}}. */
export function renderPreviewTemplate(
  name: string,
  params: Record<string, string>,
  extensionData: Record<string, unknown>,
  canEdit: boolean
): string | null {
  if (name !== 'FamilyTree') return null

  const trees: Record<string, FamilyTreePreviewRecord> = {}
  const raw = extensionData.familyTrees
  if (raw && typeof raw === 'object') {
    for (const [slug, record] of Object.entries(raw as Record<string, unknown>)) {
      if (isPreviewRecord(record)) trees[slug] = record
    }
  }

  return renderFamilyTreeEmbedClient(params, trees, canEdit)
}
