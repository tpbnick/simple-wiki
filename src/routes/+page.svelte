<script lang="ts">
  import { Pencil, History, Clock } from 'lucide-svelte'
  import WikiArticleBody from '$lib/components/WikiArticleBody.svelte'
  import { tocStore } from '$lib/stores/toc.svelte.js'
  import type { PageData } from './$types'
  import { formatTimeAgo, formatDateTime, toDatetimeAttr } from '$lib/format.js'

  let { data }: { data: PageData } = $props()

  $effect(() => { tocStore.set(data.toc ?? []) })
</script>

<svelte:head>
  <title>{data.homePage?.title ?? 'Wiki'} — Wiki</title>
</svelte:head>

{#if data.homePage}
  <div class="flex min-h-full">
    <article class="wiki-article-container flex-1 min-w-0 px-6 py-6 lg:px-10 lg:py-8">

      <header class="mb-6 pb-4 border-b border-base-200">
        <div class="flex items-start justify-between gap-4">
          <h1 class="text-3xl font-bold text-base-content leading-tight tracking-tight">
            {data.homePage.title}
          </h1>
          {#if data.canEdit}
            <div class="flex gap-1 shrink-0 mt-1">
              <a
                href="/wiki/home/edit"
                class="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium
                       text-base-content/60 hover:bg-base-200 hover:text-base-content border
                       border-transparent hover:border-base-300 transition-all"
              >
                <Pencil size={12} />
                Edit
              </a>
              <a
                href="/wiki/home/history"
                class="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium
                       text-base-content/60 hover:bg-base-200 hover:text-base-content border
                       border-transparent hover:border-base-300 transition-all"
              >
                <History size={12} />
                History
              </a>
            </div>
          {/if}
        </div>
        <div class="flex items-center gap-1.5 mt-2 text-xs text-base-content/40">
          <Clock size={11} />
          <time datetime={toDatetimeAttr(data.homePage.updated_at)} title={formatDateTime(data.homePage.updated_at)}>
            Last edited {formatTimeAgo(data.homePage.updated_at)}
          </time>
        </div>
      </header>

      <WikiArticleBody html={data.homeHtml} />

    </article>
  </div>
{:else}
  <div class="flex items-center justify-center min-h-[60vh] p-8">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-2">Welcome to your Wiki</h1>
      <p class="text-base-content/60 text-sm">The home page has not been created yet.</p>
    </div>
  </div>
{/if}
