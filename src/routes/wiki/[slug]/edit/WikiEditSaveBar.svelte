<script lang="ts">
import { enhance } from '$app/forms'
import type { SubmitFunction } from '@sveltejs/kit'
import EditConflictBanner from '$lib/components/EditConflictBanner.svelte'

let {
  summary = $bindable(),
  formError,
  conflictServerUpdatedAt = null,
  cancelHref,
  isNew,
  saving = $bindable(),
  formEl = $bindable(null),
  onEnhance,
  onDiscardConflict,
  onOverwriteConflict
}: {
  summary: string
  formError?: string
  conflictServerUpdatedAt?: string | null
  cancelHref: string
  isNew: boolean
  saving: boolean
  formEl?: HTMLFormElement | null
  onEnhance: SubmitFunction
  onDiscardConflict?: () => void
  onOverwriteConflict?: () => void
} = $props()
</script>

<form
  method="POST"
  action="?/save"
  bind:this={formEl}
  use:enhance={onEnhance}
  class="flex items-center gap-3 px-4 py-2 border-t border-base-300 bg-base-100 shrink-0 flex-wrap"
>
  {#if conflictServerUpdatedAt && onDiscardConflict && onOverwriteConflict}
    <EditConflictBanner
      {saving}
      onReload={onDiscardConflict}
      onOverwrite={onOverwriteConflict}
    />
  {:else if formError}
    <p class="w-full text-xs text-error -mb-1" role="alert">{formError}</p>
  {/if}
  <input
    id="edit-summary"
    type="text"
    name="summary"
    bind:value={summary}
    placeholder="Edit summary (optional)"
    class="input input-bordered input-sm flex-1 max-w-xs text-sm"
  />
  <div class="flex gap-2 ml-auto">
    <a href={cancelHref} class="btn btn-ghost btn-sm">Cancel</a>
    <button
      type="submit"
      class="btn btn-primary btn-sm"
      disabled={saving || !!conflictServerUpdatedAt}
    >
      {#if saving}
        <span class="loading loading-spinner loading-xs"></span>
      {/if}
      {isNew ? 'Create page' : 'Save changes'}
    </button>
  </div>
</form>
