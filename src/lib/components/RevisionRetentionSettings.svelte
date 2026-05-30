<script lang="ts">
  import { enhance } from '$app/forms'
  import { Settings2 } from 'lucide-svelte'

  let {
    revisionRetention,
    formAction,
    form = null,
    showFeedback = true
  }: {
    revisionRetention: number | null
    formAction: string
    form?: {
      retentionUpdated?: boolean
      revisionRetention?: number | null
      prunedCount?: number
      retentionError?: string
    } | null
    showFeedback?: boolean
  } = $props()

  let retentionInput = $state('')

  $effect(() => {
    retentionInput = revisionRetention == null ? '' : String(revisionRetention)
  })
</script>

<div class="rounded-xl border border-base-200 p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
      <Settings2 size={16} class="text-base-content/60" />
    </div>
    <div>
      <h2 class="font-semibold text-base-content">Revision retention</h2>
      <p class="text-sm text-base-content/60 mt-1">
        Limit how many past versions are stored per page. Older revisions are deleted automatically.
      </p>
    </div>
  </div>

  {#if showFeedback && form?.retentionUpdated}
    <div class="alert alert-success mb-4 text-sm">
      {#if form.revisionRetention == null}
        <p>Revision history is now unlimited.</p>
      {:else}
        <p>
          Keeping the last {form.revisionRetention} revisions per page.
          {#if (form.prunedCount ?? 0) > 0}
            Removed {form.prunedCount} older {form.prunedCount === 1 ? 'revision' : 'revisions'}.
          {/if}
        </p>
      {/if}
    </div>
  {/if}

  {#if showFeedback && form?.retentionError}
    <p class="text-error text-sm mb-4" role="alert">{form.retentionError}</p>
  {/if}

  <form method="POST" action={formAction} use:enhance class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col gap-1.5 text-sm">
      <span class="font-medium text-base-content/70">Keep last N revisions per page</span>
      <input
        type="number"
        name="revisionRetention"
        min="1"
        step="1"
        placeholder="Unlimited"
        bind:value={retentionInput}
        class="h-9 px-3 rounded-lg border border-base-300 bg-base-100 w-40
               focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </label>
    <button
      type="submit"
      class="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
             bg-primary text-primary-content hover:bg-primary/90 transition-colors"
    >
      Save settings
    </button>
  </form>
  <p class="text-xs text-base-content/45 mt-3">
    Leave blank for unlimited history. The current page content is always kept; this only limits stored past versions.
  </p>
</div>
