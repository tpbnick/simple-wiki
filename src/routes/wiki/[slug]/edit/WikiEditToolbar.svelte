<script lang="ts">
import { ChevronDown, Images, LayoutList, Upload } from 'lucide-svelte'
import type { Component } from 'svelte'
import type { ToolbarAction } from '$lib/wiki-edit/toolbar-actions.js'
import type { EditorToolbarItem } from '$lib/extensions/types.js'
import type { EditorToolbarPanelProps } from '$lib/extensions/editor-panels.js'
import { extensionIdFromGlobPath } from '$lib/extensions/client-id.js'

const panelModules = import.meta.glob<{ default: Component<EditorToolbarPanelProps> }>(
  '../../../../../extensions/*/components/EditorToolbarPanel.svelte',
  { eager: true }
)

const editorToolbarPanels: Record<string, Component<EditorToolbarPanelProps>> = Object.fromEntries(
  Object.entries(panelModules).flatMap(([path, module]) => {
    const id = extensionIdFromGlobPath(path)
    return id ? [[id, module.default]] : []
  })
)

let {
  toolbarActions,
  editorTools,
  editorExtensionData,
  previewData,
  hasInfoboxInContent,
  showInfoboxAddMenu = $bindable(),
  uploading,
  uploadError,
  onInsertInfobox,
  onInsertImageBox,
  onUploadClick,
  insertAt,
  patchPreviewData
}: {
  toolbarActions: ToolbarAction[]
  editorTools: EditorToolbarItem[]
  editorExtensionData: Record<string, unknown>
  previewData: Record<string, unknown>
  hasInfoboxInContent: boolean
  showInfoboxAddMenu: boolean
  uploading: boolean
  uploadError: string
  onInsertInfobox: (variant?: string) => void
  onInsertImageBox: () => void
  onUploadClick: () => void
  insertAt: (text: string) => void
  patchPreviewData: (patch: Record<string, unknown>) => void
} = $props()

let openExtensionMenu = $state<string | null>(null)

function closeInfoboxAddMenu() {
  showInfoboxAddMenu = false
}

function toggleInfoboxMenu() {
  showInfoboxAddMenu = !showInfoboxAddMenu
  if (showInfoboxAddMenu) openExtensionMenu = null
}
</script>

<div
  class="flex items-center gap-0.5 px-2 py-1 border-b border-base-300 bg-base-200 shrink-0 flex-wrap"
>
  {#each toolbarActions as { icon: Icon, label, action }}
    <button
      type="button"
      onclick={action}
      title={label}
      aria-label={label}
      class="btn btn-ghost btn-xs btn-square"
    >
      <Icon size={14} />
    </button>
  {/each}

  <div class="divider divider-horizontal mx-0.5 h-4 self-center"></div>

  <div class="infobox-toolbar-wrap relative">
    <button
      type="button"
      title="Add infobox"
      aria-label="Add infobox"
      aria-expanded={showInfoboxAddMenu}
      class="btn btn-ghost btn-xs gap-1"
      disabled={hasInfoboxInContent}
      onclick={toggleInfoboxMenu}
    >
      <LayoutList size={14} />
      <span class="hidden sm:inline text-xs">Infobox</span>
      <ChevronDown
        size={12}
        class="opacity-60 transition-transform {showInfoboxAddMenu ? 'rotate-180' : ''}"
      />
    </button>

    {#if showInfoboxAddMenu && !hasInfoboxInContent}
      <div class="infobox-toolbar-menu" role="menu">
        <button
          type="button"
          role="menuitem"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => {
            onInsertInfobox()
            closeInfoboxAddMenu()
          }}
        >
          Basic infobox
        </button>
        <button
          type="button"
          role="menuitem"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => {
            onInsertInfobox('Person')
            closeInfoboxAddMenu()
          }}
        >
          Person infobox
        </button>
        <button
          type="button"
          role="menuitem"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => {
            onInsertInfobox('Country')
            closeInfoboxAddMenu()
          }}
        >
          Country infobox
        </button>
      </div>
    {/if}
  </div>

  <button
    type="button"
    title="Add image box"
    aria-label="Add image box"
    class="btn btn-ghost btn-xs gap-1"
    onclick={onInsertImageBox}
  >
    <Images size={14} />
    <span class="hidden sm:inline text-xs">Image box</span>
  </button>

  {#each editorTools as tool}
    {@const Panel = editorToolbarPanels[tool.extensionId ?? tool.id]}
    {#if Panel}
      <Panel
        {tool}
        open={openExtensionMenu === tool.id}
        editorData={editorExtensionData}
        {previewData}
        {insertAt}
        onOpenChange={(next) => {
          openExtensionMenu = next ? tool.id : null
          if (next) showInfoboxAddMenu = false
        }}
        {patchPreviewData}
      />
    {/if}
  {/each}

  <button
    type="button"
    onclick={onUploadClick}
    title="Upload file or image"
    aria-label="Upload file or image"
    class="btn btn-ghost btn-xs gap-1"
    disabled={uploading}
  >
    {#if uploading}
      <span class="loading loading-spinner loading-xs"></span>
    {:else}
      <Upload size={14} />
    {/if}
    <span class="hidden sm:inline text-xs">Upload</span>
  </button>

  {#if uploadError}
    <span class="text-error text-xs ml-1">{uploadError}</span>
  {/if}

  <span class="text-xs text-base-content/40 ml-auto hidden md:inline">
    Markdown + [[wiki links]] + references
  </span>
</div>
