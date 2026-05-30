<script lang="ts">
  import { base } from '$app/paths'
  import { Github } from 'lucide-svelte'
  import { getBuildInfo } from '$lib/build-info.js'
  import { formatBuildDate } from '$lib/format.js'

  let {
    open,
    onClose,
    dialogEl = $bindable<HTMLDivElement | null>(null)
  }: {
    open: boolean
    onClose: () => void
    dialogEl?: HTMLDivElement | null
  } = $props()

  const buildInfo = getBuildInfo()
  const hasCommit = buildInfo.commitSha !== 'unknown'

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  $effect(() => {
    if (open) dialogEl?.focus()
  })
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-base-content/20 backdrop-blur-sm"
      aria-label="Close about dialog"
      onclick={onClose}
      tabindex="-1"
    ></button>
    <div
      bind:this={dialogEl}
      class="relative bg-base-100 rounded-2xl border border-base-200 shadow-xl w-full max-w-sm p-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      tabindex="-1"
      onkeydown={handleModalKeydown}
    >
      <img
        src="{base}/logo.png"
        alt=""
        width="64"
        height="64"
        class="mx-auto mb-3 rounded-xl"
      />
      <h2 id="about-dialog-title" class="text-lg font-bold text-base-content">Simple-Wiki</h2>
      <p class="text-sm text-base-content/60 mt-1 mb-5">A simple markdown wiki application</p>

      <dl class="text-sm text-base-content/70 space-y-2 mb-6 text-left">
        <div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <dt class="text-base-content/50">Version</dt>
          <dd class="font-mono font-medium text-base-content">v{buildInfo.version}</dd>
        </div>
        <div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <dt class="text-base-content/50">Last update</dt>
          <dd class="font-medium text-base-content">{formatBuildDate(buildInfo.commitDate)}</dd>
        </div>
        <div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <dt class="text-base-content/50">Last commit</dt>
          <dd>
            {#if hasCommit}
              <a
                href={buildInfo.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
              >
                <Github size={14} aria-hidden="true" />
                {buildInfo.shortCommit}
              </a>
            {:else}
              <span class="font-mono text-sm text-base-content/50">unknown</span>
            {/if}
          </dd>
        </div>
      </dl>

      <p class="text-sm text-base-content/60">
        Made with <span aria-label="love">♥</span> by
        <a
          href="https://nickplatt.dev"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline font-medium"
        >
          Nick Platt
        </a>
      </p>

      <button
        type="button"
        onclick={onClose}
        class="mt-6 h-9 px-4 rounded-lg text-sm font-medium text-base-content/70
               hover:bg-base-200 border border-base-300 transition-all"
      >
        Close
      </button>
    </div>
  </div>
{/if}
