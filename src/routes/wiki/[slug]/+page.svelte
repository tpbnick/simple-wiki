<script lang="ts">
import { Pencil, History, FilePlus, Clock } from 'lucide-svelte'
import WikiArticleBody from '$lib/components/WikiArticleBody.svelte'
import { tocStore } from '$lib/stores/toc.svelte.js'
import type { PageData } from './$types'
import { formatTimeAgo, formatDateTime, toDatetimeAttr } from '$lib/format.js'

let { data }: { data: PageData } = $props()

$effect(() => {
  tocStore.set(data.toc ?? [])
})
</script>

<svelte:head>
  <title>{data.page?.title ?? `${data.suggestedTitle} not found`} — Wiki</title>
</svelte:head>

{#if !data.page}
  <!-- ── 404 / empty state ─────────────────────── -->
  <div class="flex items-center justify-center min-h-[60vh] p-8">
    <div class="text-center max-w-md">
      <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
        <FilePlus size={24} class="text-base-content/30" />
      </div>
      <h1 class="text-xl font-bold mb-2">{data.suggestedTitle} not found</h1>
      {#if data.canEdit}
        <p class="text-base-content/60 text-sm mb-5">Do you want to create it?</p>
        <a
          href="/wiki/{data.slug}/edit?title={encodeURIComponent(data.suggestedTitle)}"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary
                 text-primary-content text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FilePlus size={15} />
          Create "{data.suggestedTitle}"
        </a>
      {:else}
        <p class="text-base-content/60 text-sm">This page doesn't exist.</p>
        <a href="/" class="mt-4 inline-block text-primary hover:underline text-sm">← Back to home</a
        >
      {/if}
    </div>
  </div>
{:else}
  <!-- ── Article view ──────────────────────────── -->
  <div class="flex min-h-full">
    <article class="wiki-article-container flex-1 min-w-0 px-6 py-6 lg:px-10 lg:py-8">
      <!-- Article header -->
      <header class="mb-6 pb-4 border-b border-base-200">
        <div class="flex items-start justify-between gap-4">
          <h1 class="text-3xl font-bold text-base-content leading-tight tracking-tight">
            {data.page.title}
          </h1>
          {#if data.canEdit}
            <div class="flex gap-1 shrink-0 mt-1">
              <a
                href="/wiki/{data.page.slug}/edit"
                class="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium
                       text-base-content/60 hover:bg-base-200 hover:text-base-content border
                       border-transparent hover:border-base-300 transition-all"
                title="Edit"
              >
                <Pencil size={12} />
                Edit
              </a>
              <a
                href="/wiki/{data.page.slug}/history"
                class="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium
                       text-base-content/60 hover:bg-base-200 hover:text-base-content border
                       border-transparent hover:border-base-300 transition-all"
                title="History"
              >
                <History size={12} />
                History
              </a>
            </div>
          {/if}
        </div>
        <div class="flex items-center gap-1.5 mt-2 text-xs text-base-content/40">
          <Clock size={11} />
          <time
            datetime={toDatetimeAttr(data.page.updated_at)}
            title={formatDateTime(data.page.updated_at)}
          >
            Last edited {formatTimeAgo(data.page.updated_at)}
          </time>
        </div>
      </header>

      <!-- Article body -->
      <WikiArticleBody html={data.html} />
    </article>
  </div>
{/if}
