<script lang="ts">
  import { Puzzle } from 'lucide-svelte'

  let {
    extensions
  }: {
    extensions: Array<{
      name: string
      version: string
      description?: string
      manageHref?: string | null
    }>
  } = $props()
</script>

{#if extensions.length === 0}
  <div class="text-center py-16">
    <div class="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
      <Puzzle size={22} class="text-base-content/30" />
    </div>
    <p class="text-base-content/50 text-sm font-medium mb-1">No extensions loaded</p>
    <p class="text-base-content/35 text-xs">Add an extension as <code class="font-mono bg-base-200 px-1 rounded">extensions/&lt;name&gt;/index.ts</code> in the repo, then restart the server.</p>
  </div>
{:else}
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each extensions as ext}
      {#if ext.manageHref}
        <a
          href={ext.manageHref}
          class="bg-base-100 border border-wiki-border rounded-[var(--radius-box)] shadow-[var(--shadow-sm)] p-4
                 hover:border-primary/40 hover:shadow-md transition-all group"
        >
          <div class="flex items-start justify-between gap-2 mb-1">
            <p class="font-semibold text-sm text-base-content group-hover:text-primary transition-colors">{ext.name}</p>
            <span class="text-xs text-base-content/40 font-mono shrink-0">v{ext.version}</span>
          </div>
          {#if ext.description}
            <p class="text-xs text-base-content/55">{ext.description}</p>
          {/if}
          <p class="text-xs text-primary/70 mt-2 font-medium">Open →</p>
        </a>
      {:else}
        <div class="bg-base-100 border border-wiki-border rounded-[var(--radius-box)] shadow-[var(--shadow-sm)] p-4">
          <div class="flex items-start justify-between gap-2 mb-1">
            <p class="font-semibold text-sm text-base-content">{ext.name}</p>
            <span class="text-xs text-base-content/40 font-mono shrink-0">v{ext.version}</span>
          </div>
          {#if ext.description}
            <p class="text-xs text-base-content/55">{ext.description}</p>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
