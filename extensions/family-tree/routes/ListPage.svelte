<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
  import { createFamilyTree } from '$lib/family-tree/create-tree.js'
  import { GitBranch, Plus, Trash2 } from 'lucide-svelte'
  import type { ListPageData } from './types.js'

  let { data }: { data: ListPageData } = $props()
  let title = $state('')
  let creating = $state(false)
  let error = $state('')
  let deleteTarget = $state<{ slug: string; title: string } | null>(null)
  let deleteLoading = $state(false)
  let deleteError = $state('')

  async function createTree() {
    const trimmed = title.trim()
    if (!trimmed) return

    creating = true
    error = ''

    try {
      const payload = await createFamilyTree(trimmed)
      await goto(`/family-tree/${payload.slug}`)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not create tree'
    } finally {
      creating = false
    }
  }

  function openDeleteModal(tree: { slug: string; title: string }) {
    deleteTarget = tree
    deleteError = ''
  }

  function closeDeleteModal() {
    deleteTarget = null
    deleteError = ''
  }

  async function submitDelete() {
    if (!deleteTarget) return

    deleteLoading = true
    deleteError = ''

    try {
      const response = await fetch(`/api/family-tree/${encodeURIComponent(deleteTarget.slug)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Delete failed')
      }

      closeDeleteModal()
      await invalidateAll()
    } catch (err) {
      deleteError = err instanceof Error ? err.message : 'Delete failed'
    } finally {
      deleteLoading = false
    }
  }
</script>

<svelte:head>
  <title>Family trees — Wiki</title>
</svelte:head>

<div class="p-6 max-w-3xl">
  <div class="flex items-center gap-3 mb-8">
    <div class="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
      <GitBranch size={18} class="text-violet-600 dark:text-violet-300" />
    </div>
    <div>
      <h1 class="text-2xl font-bold">Family trees</h1>
      <p class="text-sm text-base-content/50">Vertical trees with people, spouses, and children.</p>
    </div>
  </div>

  {#if data.canEdit}
    <form class="wiki-card p-4 mb-6 flex flex-col sm:flex-row gap-3" onsubmit={(e) => { e.preventDefault(); createTree() }}>
      <label class="flex-1">
        <span class="sr-only">Tree title</span>
        <input
          type="text"
          bind:value={title}
          placeholder="Enter family name"
          class="input input-bordered input-sm w-full"
        />
      </label>
      <button type="submit" class="btn btn-primary btn-sm" disabled={creating || !title.trim()}>
        <Plus size={14} />
        New tree
      </button>
    </form>
    {#if error}
      <p class="text-sm text-error mb-4">{error}</p>
    {/if}
  {/if}

  {#if data.trees.length === 0}
    <p class="text-base-content/60">No family trees yet.</p>
  {:else}
    <ul class="space-y-2">
      {#each data.trees as tree}
        <li class="wiki-card p-4 flex items-center gap-3">
          <a href="/family-tree/{tree.slug}" class="flex-1 min-w-0 group">
            <p class="font-medium text-primary group-hover:underline">{tree.title}</p>
            <p class="text-xs text-base-content/40 mt-1">Updated {tree.updated_at}</p>
          </a>
          {#if data.canEdit}
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square text-error shrink-0"
              aria-label="Delete {tree.title}"
              onclick={() => openDeleteModal(tree)}
            >
              <Trash2 size={15} />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<ConfirmDialog
  open={deleteTarget !== null}
  title="Confirm deletion"
  titleId="delete-tree-dialog-title"
  error={deleteError}
  loading={deleteLoading}
  confirmLabel="Delete"
  loadingLabel="Deleting…"
  onClose={closeDeleteModal}
  onConfirm={submitDelete}
>
  {#if deleteTarget}
    Delete <strong class="text-base-content">{deleteTarget.title}</strong> tree? This cannot be undone.
  {/if}
</ConfirmDialog>
