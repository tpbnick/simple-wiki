<script lang="ts">
import { ChevronDown, GitBranch } from 'lucide-svelte'
import { createFamilyTree } from '../lib/create-tree-client.js'
import type { EditorToolbarPanelProps } from '$lib/extensions/editor-panels.js'

let {
  tool,
  open,
  editorData,
  previewData,
  insertAt,
  onOpenChange,
  patchPreviewData
}: EditorToolbarPanelProps = $props()

let newTitle = $state('')
let creating = $state(false)
let error = $state('')
let createdTrees = $state<Array<{ slug: string; title: string }>>([])

const trees = $derived.by(() => {
  const loaded = editorData.familyTrees
  const fromServer = Array.isArray(loaded)
    ? loaded.filter(
        (tree): tree is { slug: string; title: string } =>
          typeof tree === 'object' &&
          tree !== null &&
          typeof tree.slug === 'string' &&
          typeof tree.title === 'string'
      )
    : []
  const createdSlugs = new Set(createdTrees.map((tree) => tree.slug))
  return [...createdTrees, ...fromServer.filter((tree) => !createdSlugs.has(tree.slug))]
})

function closeMenu() {
  error = ''
  onOpenChange(false)
}

function toggleMenu() {
  if (open) closeMenu()
  else onOpenChange(true)
}

function insertEmbed(slug: string) {
  insertAt(`\n{{FamilyTree|family=${slug}}}\n`)
  closeMenu()
}

async function createAndInsert() {
  const trimmed = newTitle.trim()
  if (!trimmed) return

  creating = true
  error = ''

  try {
    const payload = await createFamilyTree(trimmed)
    newTitle = ''
    createdTrees = [{ slug: payload.slug, title: payload.title }, ...createdTrees]
    const existing =
      previewData.familyTrees && typeof previewData.familyTrees === 'object'
        ? previewData.familyTrees
        : {}
    patchPreviewData({
      familyTrees: {
        ...existing,
        [payload.slug]: { title: payload.title, data: payload.data }
      }
    })
    insertEmbed(payload.slug)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not create family tree'
  } finally {
    creating = false
  }
}
</script>

<svelte:window
  onclick={(event) => {
    const target = event.target as HTMLElement | null
    if (open && !target?.closest('.family-tree-toolbar-wrap')) closeMenu()
  }}
/>

<div class="family-tree-toolbar-wrap relative">
  <button
    type="button"
    title={tool.description ?? tool.label}
    aria-label={tool.label}
    aria-expanded={open}
    class="btn btn-ghost btn-xs gap-1"
    onclick={toggleMenu}
  >
    <GitBranch size={14} />
    <span class="hidden sm:inline text-xs">{tool.label}</span>
    <ChevronDown size={12} class="opacity-60 transition-transform {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <div class="infobox-toolbar-menu family-tree-toolbar-menu" role="menu">
      {#if trees.length > 0}
        <p
          class="px-3 pt-1 pb-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-base-content/40"
        >
          Insert existing
        </p>
        {#each trees as tree}
          <button
            type="button"
            role="menuitem"
            onmousedown={(e) => e.preventDefault()}
            onclick={() => insertEmbed(tree.slug)}
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
          void createAndInsert()
        }}
      >
        <label class="sr-only" for="family-tree-new-title">New family tree name</label>
        <input
          id="family-tree-new-title"
          name="family-tree-new-title"
          type="text"
          bind:value={newTitle}
          placeholder="Tree name"
          class="input input-bordered input-xs w-full"
        />
        <button
          type="submit"
          class="btn btn-primary btn-xs w-full"
          disabled={creating || !newTitle.trim()}
        >
          {creating ? 'Creating…' : 'Create & insert'}
        </button>
      </form>
      {#if error}
        <p class="px-3 pb-2 text-xs text-error">{error}</p>
      {/if}
      <a
        href="/family-tree"
        class="block px-3 py-2 text-xs text-base-content/60 hover:text-base-content hover:bg-base-200"
        onclick={closeMenu}
      >
        Manage all trees →
      </a>
    </div>
  {/if}
</div>
