<script lang="ts">
  import { BookOpen, Layers, ArrowRight, Clock } from 'lucide-svelte'
  import type { PageData } from './$types'
  import { formatTimeAgo, toDatetimeAttr, formatDateTime } from '$lib/format.js'

  let { data }: { data: PageData } = $props()

  const nsLabels: Record<string, string> = {
    article: 'All Pages',
    template: 'Templates',
  }

  const alphabetical = $derived(
    [...data.pages].sort((a, b) => a.title.localeCompare(b.title))
  )

  const grouped = $derived.by(() => {
    const map = new Map<string, typeof data.pages>()
    for (const page of alphabetical) {
      const letter = page.title[0]?.toUpperCase() ?? '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(page)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  })
</script>

<svelte:head>
  <title>{nsLabels[data.ns] ?? 'Pages'} — Wiki</title>
</svelte:head>

<div class="px-6 py-8 lg:px-10">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div class="flex items-center gap-3">
      {#if data.ns === 'template'}
        <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Layers size={18} class="text-indigo-600 dark:text-indigo-400" />
        </div>
      {:else}
        <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <BookOpen size={18} class="text-blue-600 dark:text-blue-400" />
        </div>
      {/if}
      <div>
        <h1 class="text-2xl font-bold text-base-content tracking-tight">
          {nsLabels[data.ns] ?? 'Pages'}
        </h1>
        <p class="text-sm text-base-content/50">{data.pages.length} {data.pages.length === 1 ? 'page' : 'pages'}</p>
      </div>
    </div>

    <!-- Namespace tabs -->
    <div class="flex gap-1 p-1 bg-base-200 rounded-lg">
      <a
        href="/pages"
        aria-current={data.ns === 'article' ? 'page' : undefined}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
               {data.ns === 'article' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'}"
      >
        <BookOpen size={13} />
        Articles
      </a>
      <a
        href="/pages?ns=template"
        aria-current={data.ns === 'template' ? 'page' : undefined}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
               {data.ns === 'template' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'}"
      >
        <Layers size={13} />
        Templates
      </a>
    </div>
  </div>

  {#if data.pages.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
        <BookOpen size={24} class="text-base-content/30" />
      </div>
      <p class="text-base-content/50 text-sm">No {data.ns === 'template' ? 'templates' : 'pages'} yet.</p>
    </div>
  {:else}
    <!-- Alphabetical groups -->
    <div class="space-y-8">
      {#each grouped as [letter, pages]}
        <div>
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl font-bold text-primary/60 w-8 shrink-0">{letter}</span>
            <div class="flex-1 border-t border-base-200"></div>
          </div>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {#each pages as page}
              <a
                href="/wiki/{page.slug}"
                class="wiki-card flex items-center justify-between p-3 group"
              >
                <div class="min-w-0">
                  <p class="font-medium text-sm text-base-content group-hover:text-primary transition-colors truncate">
                    {page.title}
                  </p>
                  <p class="text-xs text-base-content/40 flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    <time datetime={toDatetimeAttr(page.updated_at)} title={formatDateTime(page.updated_at)}>
                      {formatTimeAgo(page.updated_at, 'short')}
                    </time>
                  </p>
                </div>
                <ArrowRight size={13} class="shrink-0 text-base-content/30 group-hover:text-primary transition-colors ml-2" />
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
