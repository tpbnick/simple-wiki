<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.q ? `Search: ${data.q}` : 'Search'} — Wiki</title>
</svelte:head>

<div class="p-6 max-w-3xl">
  {#if !data.q.trim()}
    <h1 class="text-2xl font-semibold mb-4">Search</h1>
    <p class="text-base-content/60">Enter a search term in the header to find pages.</p>
  {:else}
    <h1 class="text-2xl font-semibold mb-4">
      Search results for <em class="font-normal">"{data.q}"</em>
    </h1>

    {#if data.results.length === 0}
      <p class="text-base-content/60">No pages matched your search.</p>
      {#if data.canEdit}
        <a href="/wiki/new/edit?title={encodeURIComponent(data.q)}" class="btn btn-primary btn-sm mt-4">
          Create "{data.q}"
        </a>
      {/if}
    {:else}
      <p class="text-sm text-base-content/50 mb-4" role="status">
        {data.results.length} result{data.results.length === 1 ? '' : 's'}
      </p>
      <ul class="space-y-2">
        {#each data.results as result}
          <li>
            <a href="/wiki/{result.slug}" class="wiki-card block p-4 group overflow-hidden min-w-0">
              <p class="font-medium text-base text-primary group-hover:underline transition-colors break-words">{result.title}</p>
              {#if result.snippet}
                <p class="search-snippet text-sm text-base-content/70 mt-1">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html result.snippet}
                </p>
              {/if}
              <p class="text-xs text-base-content/40 mt-1.5 break-all">/wiki/{result.slug}</p>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  :global(mark) {
    background: color-mix(in srgb, var(--color-primary) 25%, transparent);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }

  :global(.search-snippet) {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
</style>
