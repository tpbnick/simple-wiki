<script lang="ts">
  import { Clock, Settings2 } from 'lucide-svelte'
  import RevisionRetentionSettings from '$lib/components/RevisionRetentionSettings.svelte'

  let {
    changeCount,
    revisionRetention,
    isAdmin = false,
    form = null,
    formAction = '?/updateRevisionRetention',
    settingsTab,
    showFeedback = true,
    compact = false
  }: {
    changeCount: number
    revisionRetention: number | null
    isAdmin?: boolean
    form?: Record<string, unknown> | null
    formAction?: string
    settingsTab?: string
    showFeedback?: boolean
    compact?: boolean
  } = $props()

  let showSettings = $state(false)

  const showRetentionFeedback = $derived(
    showFeedback && (!settingsTab || form?.tab === settingsTab)
  )

  $effect(() => {
    if (form?.retentionUpdated && (!settingsTab || form.tab === settingsTab)) {
      showSettings = true
    }
  })
</script>

<div class="flex flex-wrap items-center justify-between gap-3 {compact ? 'mb-4' : 'mb-8'}">
  <div class="min-w-0">
    {#if !compact}
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Clock size={18} class="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-base-content tracking-tight">Recent Changes</h1>
          <p class="text-sm text-base-content/50">
            {#if revisionRetention != null}
              Last {changeCount} edits · keeping {revisionRetention} revisions per page
            {:else}
              Last {changeCount} recorded edits
            {/if}
          </p>
        </div>
      </div>
    {:else}
      <p class="text-sm text-base-content/60">
        {#if revisionRetention != null}
          Last {changeCount} edits · keeping {revisionRetention} revisions per page
        {:else}
          Last {changeCount} recorded edits
        {/if}
      </p>
    {/if}
  </div>
  {#if isAdmin}
    <button
      type="button"
      onclick={() => { showSettings = !showSettings }}
      aria-expanded={showSettings}
      class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border transition-colors shrink-0
             {showSettings
               ? 'border-primary bg-primary/10 text-primary'
               : 'border-base-300 text-base-content/60 hover:bg-base-200 hover:text-base-content'}"
    >
      <Settings2 size={14} />
      Settings
    </button>
  {/if}
</div>

{#if isAdmin && showSettings}
  <div class="{compact ? 'mb-6' : 'mb-8'}">
    <RevisionRetentionSettings
      {revisionRetention}
      {formAction}
      form={showRetentionFeedback ? form : null}
      showFeedback={showRetentionFeedback}
    />
  </div>
{/if}
