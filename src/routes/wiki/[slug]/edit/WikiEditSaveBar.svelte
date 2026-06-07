<script lang="ts">
import { enhance } from '$app/forms'
import type { SubmitFunction } from '@sveltejs/kit'

let {
  summary = $bindable(),
  formError,
  cancelHref,
  isNew,
  saving = $bindable(),
  onEnhance
}: {
  summary: string
  formError?: string
  cancelHref: string
  isNew: boolean
  saving: boolean
  onEnhance: SubmitFunction
} = $props()
</script>

<form
  method="POST"
  action="?/save"
  use:enhance={onEnhance}
  class="flex items-center gap-3 px-4 py-2 border-t border-base-300 bg-base-100 shrink-0 flex-wrap"
>
  {#if formError}
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
    <button type="submit" class="btn btn-primary btn-sm" disabled={saving}>
      {#if saving}
        <span class="loading loading-spinner loading-xs"></span>
      {/if}
      {isNew ? 'Create page' : 'Save changes'}
    </button>
  </div>
</form>
