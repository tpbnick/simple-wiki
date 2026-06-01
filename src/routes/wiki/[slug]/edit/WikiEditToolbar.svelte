<script lang="ts">
import { ChevronDown, GitBranch, Images, LayoutList, Upload } from 'lucide-svelte'
import type { ToolbarAction } from '$lib/wiki-edit/toolbar-actions.js'

let {
  toolbarActions,
  hasInfoboxInContent,
  showInfoboxAddMenu = $bindable(),
  showFamilyTreeMenu = $bindable(),
  hasFamilyTreeTool,
  familyTrees,
  newFamilyTreeTitle = $bindable(),
  creatingFamilyTree,
  familyTreeError,
  uploading,
  uploadError,
  onInsertInfobox,
  onInsertImageBox,
  onInsertFamilyTree,
  onCreateFamilyTree,
  onUploadClick,
  onCloseFamilyTreeMenu
}: {
  toolbarActions: ToolbarAction[]
  hasInfoboxInContent: boolean
  showInfoboxAddMenu: boolean
  showFamilyTreeMenu: boolean
  hasFamilyTreeTool: boolean
  familyTrees: Array<{ slug: string; title: string }>
  newFamilyTreeTitle: string
  creatingFamilyTree: boolean
  familyTreeError: string
  uploading: boolean
  uploadError: string
  onInsertInfobox: (variant?: string) => void
  onInsertImageBox: () => void
  onInsertFamilyTree: (slug: string) => void
  onCreateFamilyTree: () => void | Promise<void>
  onUploadClick: () => void
  onCloseFamilyTreeMenu: () => void
} = $props()

function closeInfoboxAddMenu() {
  showInfoboxAddMenu = false
}

function toggleInfoboxMenu() {
  showInfoboxAddMenu = !showInfoboxAddMenu
  if (showInfoboxAddMenu) {
    showFamilyTreeMenu = false
  }
}

function toggleFamilyTreeMenu() {
  showFamilyTreeMenu = !showFamilyTreeMenu
  if (showFamilyTreeMenu) {
    showInfoboxAddMenu = false
  }
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

  {#if hasFamilyTreeTool}
    <div class="family-tree-toolbar-wrap infobox-toolbar-wrap relative">
      <button
        type="button"
        title="Insert family tree"
        aria-label="Insert family tree"
        aria-expanded={showFamilyTreeMenu}
        class="btn btn-ghost btn-xs gap-1"
        onclick={toggleFamilyTreeMenu}
      >
        <GitBranch size={14} />
        <span class="hidden sm:inline text-xs">Family tree</span>
        <ChevronDown
          size={12}
          class="opacity-60 transition-transform {showFamilyTreeMenu ? 'rotate-180' : ''}"
        />
      </button>

      {#if showFamilyTreeMenu}
        <div class="infobox-toolbar-menu family-tree-toolbar-menu" role="menu">
          {#if familyTrees.length > 0}
            <p
              class="px-3 pt-1 pb-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-base-content/40"
            >
              Insert existing
            </p>
            {#each familyTrees as tree}
              <button
                type="button"
                role="menuitem"
                onmousedown={(e) => e.preventDefault()}
                onclick={() => onInsertFamilyTree(tree.slug)}
              >
                {tree.title}
              </button>
            {/each}
            <div class="border-t border-base-300 my-1"></div>
          {/if}
          <p
            class="px-3 pt-1 pb-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-base-content/40"
          >
            Create new
          </p>
          <form
            class="family-tree-toolbar-form"
            onsubmit={(event) => {
              event.preventDefault()
              void onCreateFamilyTree()
            }}
          >
            <label class="sr-only" for="family-tree-new-title">New family tree name</label>
            <input
              id="family-tree-new-title"
              name="family-tree-new-title"
              type="text"
              bind:value={newFamilyTreeTitle}
              placeholder="Tree name"
              class="input input-bordered input-xs w-full"
            />
            <button
              type="submit"
              class="btn btn-primary btn-xs w-full"
              disabled={creatingFamilyTree || !newFamilyTreeTitle.trim()}
            >
              {creatingFamilyTree ? 'Creating…' : 'Create & insert'}
            </button>
          </form>
          {#if familyTreeError}
            <p class="px-3 pb-2 text-xs text-error">{familyTreeError}</p>
          {/if}
          <a
            href="/family-tree"
            class="block px-3 py-2 text-xs text-base-content/60 hover:text-base-content hover:bg-base-200"
            onclick={onCloseFamilyTreeMenu}
          >
            Manage all trees →
          </a>
        </div>
      {/if}
    </div>
  {/if}

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
    Markdown + [[wiki links]] + templates
  </span>
</div>
