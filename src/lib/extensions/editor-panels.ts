import type { EditorToolbarItem } from './types.js'

export interface EditorToolbarPanelProps {
  tool: EditorToolbarItem
  open: boolean
  editorData: Record<string, unknown>
  previewData: Record<string, unknown>
  insertAt: (text: string) => void
  onOpenChange: (open: boolean) => void
  patchPreviewData: (patch: Record<string, unknown>) => void
}
