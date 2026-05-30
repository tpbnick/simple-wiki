<script lang="ts">
import { goto } from '$app/navigation'
import { Eye, Pencil, Plus, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-svelte'
import { formatTimeAgo, toDatetimeAttr, formatDateTime } from '$lib/format.js'
import type { AdminDeleteTarget } from './admin-types.js'

let {
  pages,
  pagesTotal,
  pagesQuery,
  pagesPage,
  pagesPageSize,
  onDelete
}: {
  pages: Array<{
    slug: string
    title: string
    namespace: string
    updated_at: string
  }>
  pagesTotal: number
  pagesQuery: string
  pagesPage: number
  pagesPageSize: number
  onDelete: (target: AdminDeleteTarget) => void
} = $props()

let searchInput = $state('')

$effect.pre(() => {
  searchInput = pagesQuery
})

const totalPages = $derived(Math.max(1, Math.ceil(pagesTotal / pagesPageSize)))
const rangeStart = $derived(pagesTotal === 0 ? 0 : (pagesPage - 1) * pagesPageSize + 1)
const rangeEnd = $derived(Math.min(pagesPage * pagesPageSize, pagesTotal))

function pagesUrl(page: number, query = pagesQuery): string {
  const params = new URLSearchParams({ tab: 'pages' })
  if (query.trim()) params.set('pagesQ', query.trim())
  if (page > 1) params.set('pagesPage', String(page))
  return `/admin?${params}`
}

function submitSearch(event: Event) {
  event.preventDefault()
  void goto(pagesUrl(1, searchInput), { keepFocus: true, noScroll: true, replaceState: true })
}
</script>

<form class="flex items-center gap-3 mb-4" onsubmit={submitSearch}>
  <div class="relative flex-1 max-w-xs">
    <Search
      size={13}
      class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none"
    />
    <input
      type="search"
      name="pagesQ"
      placeholder="Search pages…"
      bind:value={searchInput}
      class="w-full h-8 pl-8 pr-3 rounded-lg border border-base-300 bg-base-100
             text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
  </div>
  <button
    type="submit"
    class="h-8 px-3 rounded-lg text-sm font-medium border border-base-300 hover:bg-base-200 transition-colors"
  >
    Search
  </button>
  <a
    href="/wiki/new/edit"
    class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
           bg-primary text-primary-content hover:bg-primary/90 transition-colors ml-auto"
  >
    <Plus size={14} />
    New page
  </a>
</form>

{#if pagesTotal > 0}
  <p class="text-xs text-base-content/45 mb-3">
    Showing {rangeStart}–{rangeEnd} of {pagesTotal} pages
    {#if pagesQuery}(filtered){/if}
  </p>
{/if}

<div class="rounded-xl border border-base-200 overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-base-200/60 border-b border-base-200">
        <th
          class="text-left px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Title</th
        >
        <th
          class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Namespace</th
        >
        <th
          class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Updated</th
        >
        <th
          class="text-right px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Actions</th
        >
      </tr>
    </thead>
    <tbody class="divide-y divide-base-200">
      {#each pages as page}
        <tr class="hover:bg-base-200/30 transition-colors group">
          <td class="px-4 py-3">
            <a
              href="/wiki/{page.slug}"
              class="font-medium text-base-content hover:text-primary transition-colors"
            >
              {page.title}
            </a>
            <div class="text-xs text-base-content/35">/wiki/{page.slug}</div>
          </td>
          <td class="px-3 py-3">
            <span
              class="px-2 py-0.5 rounded-md text-xs bg-base-200 text-base-content/60 font-medium"
            >
              {page.namespace}
            </span>
          </td>
          <td class="px-3 py-3 text-base-content/50 text-xs">
            <time
              datetime={toDatetimeAttr(page.updated_at)}
              title={formatDateTime(page.updated_at)}
            >
              {formatTimeAgo(page.updated_at, 'short')}
            </time>
          </td>
          <td class="px-4 py-3">
            <div
              class="flex gap-1 justify-end opacity-100 lg:opacity-70 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
            >
              <a
                href="/wiki/{page.slug}"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 hover:text-base-content transition-all"
                title="View"><Eye size={13} /></a
              >
              <a
                href="/wiki/{page.slug}/edit"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 hover:text-base-content transition-all"
                title="Edit"><Pencil size={13} /></a
              >
              <button
                onclick={() => onDelete({ type: 'page', id: page.slug, label: page.title })}
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error/10 text-base-content/50 hover:text-error transition-all"
                title="Delete"><Trash2 size={13} /></button
              >
            </div>
          </td>
        </tr>
      {/each}
      {#if pages.length === 0}
        <tr
          ><td colspan="4" class="text-center py-12 text-base-content/30 text-sm">No pages found</td
          ></tr
        >
      {/if}
    </tbody>
  </table>
</div>

{#if totalPages > 1}
  <nav class="flex items-center justify-center gap-3 mt-4" aria-label="Pages pagination">
    {#if pagesPage > 1}
      <a href={pagesUrl(pagesPage - 1)} class="btn btn-sm btn-ghost gap-1">
        <ChevronLeft size={14} />
        Previous
      </a>
    {/if}
    <span class="text-xs text-base-content/50">Page {pagesPage} of {totalPages}</span>
    {#if pagesPage < totalPages}
      <a href={pagesUrl(pagesPage + 1)} class="btn btn-sm btn-ghost gap-1">
        Next
        <ChevronRight size={14} />
      </a>
    {/if}
  </nav>
{/if}
