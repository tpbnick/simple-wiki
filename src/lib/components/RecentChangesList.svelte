<script lang="ts">
import { ArrowRight, ChevronDown, GitCommitHorizontal, History } from 'lucide-svelte'
import RevisionDiffView from '$lib/components/RevisionDiffView.svelte'
import { DIFF_TOO_LARGE_MESSAGE } from '$lib/diff/lines.js'
import { formatDateTime, formatTimeAgo, toDatetimeAttr } from '$lib/format.js'
import type { RevisionDiffLine } from '$lib/db/revisions.js'
import type { RecentChange } from '$lib/db/types.js'

const DIFF_FETCH_TIMEOUT_MS = 20_000

type DiffPayload = { lines: RevisionDiffLine[]; tooLarge?: boolean }

let {
  changes,
  timeStyle = 'short',
  expandable = true
}: {
  changes: RecentChange[]
  timeStyle?: 'short' | 'long'
  expandable?: boolean
} = $props()

let expandedId = $state<number | null>(null)
let diffsById = $state<Record<number, DiffPayload>>({})
let loadingById = $state<Record<number, boolean>>({})
let errorsById = $state<Record<number, string>>({})

const inFlight = new Map<number, Promise<DiffPayload>>()

const grouped = $derived.by(() => {
  const map = new Map<string, RecentChange[]>()
  for (const change of changes) {
    const day = new Date(change.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(change)
  }
  return [...map.entries()]
})

function changeSummary(summary: string): string {
  const trimmed = summary.trim()
  return trimmed || 'Page updated'
}

async function fetchRevisionDiff(revisionId: number): Promise<DiffPayload> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DIFF_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`/api/revisions/${revisionId}/diff`, {
      signal: controller.signal
    })
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sign in to view diffs')
      }
      throw new Error(response.status === 404 ? 'Revision not found' : 'Could not load diff')
    }

    return (await response.json()) as DiffPayload
  } catch (fetchError) {
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
      throw new Error('Diff took too long to load — try page history instead')
    }
    throw fetchError
  } finally {
    clearTimeout(timeout)
  }
}

function clearRecordKey<T extends Record<number, unknown>>(record: T, key: number): T {
  const next = { ...record }
  delete next[key]
  return next
}

async function ensureDiffLoaded(revisionId: number): Promise<void> {
  if (diffsById[revisionId]) return

  let request = inFlight.get(revisionId)
  if (!request) {
    request = fetchRevisionDiff(revisionId).finally(() => {
      inFlight.delete(revisionId)
    })
    inFlight.set(revisionId, request)
  }

  loadingById = { ...loadingById, [revisionId]: true }
  errorsById = clearRecordKey(errorsById, revisionId)

  try {
    const payload = await request
    diffsById = { ...diffsById, [revisionId]: payload }
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : 'Could not load diff'
    errorsById = { ...errorsById, [revisionId]: message }
  } finally {
    loadingById = clearRecordKey(loadingById, revisionId)
  }
}

function toggleExpanded(change: RecentChange) {
  if (!expandable) return

  if (expandedId === change.id) {
    expandedId = null
    return
  }

  expandedId = change.id
  void ensureDiffLoaded(change.id)
}
</script>

{#if changes.length === 0}
  <div class="text-center py-16">
    <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
      <GitCommitHorizontal size={24} class="text-base-content/30" />
    </div>
    <p class="text-base-content/50 text-sm font-medium mb-1">No recorded changes yet</p>
    <p class="text-base-content/35 text-xs">
      Edits appear here after a page is saved with changes.
    </p>
  </div>
{:else}
  <div class="space-y-8">
    {#each grouped as [day, dayChanges]}
      <div>
        <div class="flex items-center gap-3 mb-3">
          <span
            class="text-xs font-semibold uppercase tracking-wider text-base-content/40 whitespace-nowrap"
            >{day}</span
          >
          <div class="flex-1 border-t border-base-200"></div>
        </div>
        <div class="space-y-1">
          {#each dayChanges as change (change.id)}
            <div class="wiki-card overflow-hidden">
              <div class="flex items-center justify-between gap-2 p-3.5 group">
                {#if expandable}
                  <button
                    type="button"
                    class="flex flex-1 items-start gap-3 min-w-0 text-left"
                    aria-expanded={expandedId === change.id}
                    onclick={() => toggleExpanded(change)}
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <GitCommitHorizontal size={14} class="text-primary/70" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          class="font-medium text-sm text-base-content group-hover:text-primary transition-colors truncate"
                        >
                          {change.title}
                        </span>
                        {#if change.namespace !== 'article'}
                          <span
                            class="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-base-200 text-base-content/50 font-medium"
                          >
                            {change.namespace}
                          </span>
                        {/if}
                      </div>
                      <p class="text-xs text-base-content/55 mt-0.5 truncate">
                        {changeSummary(change.summary)}
                      </p>
                      <time
                        datetime={toDatetimeAttr(change.created_at)}
                        title={formatDateTime(change.created_at)}
                        class="text-xs text-base-content/40 mt-0.5 block"
                      >
                        {timeStyle === 'short'
                          ? formatTimeAgo(change.created_at, 'short')
                          : formatTimeAgo(change.created_at)}
                      </time>
                    </div>
                  </button>
                {:else}
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <GitCommitHorizontal size={14} class="text-primary/70" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <a
                          href="/wiki/{change.slug}"
                          class="font-medium text-sm text-base-content hover:text-primary transition-colors truncate"
                        >
                          {change.title}
                        </a>
                        {#if change.namespace !== 'article'}
                          <span
                            class="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-base-200 text-base-content/50 font-medium"
                          >
                            {change.namespace}
                          </span>
                        {/if}
                      </div>
                      <p class="text-xs text-base-content/55 mt-0.5 truncate">
                        {changeSummary(change.summary)}
                      </p>
                      <time
                        datetime={toDatetimeAttr(change.created_at)}
                        title={formatDateTime(change.created_at)}
                        class="text-xs text-base-content/40 mt-0.5 block"
                      >
                        {timeStyle === 'short'
                          ? formatTimeAgo(change.created_at, 'short')
                          : formatTimeAgo(change.created_at)}
                      </time>
                    </div>
                  </div>
                {/if}
                <div class="flex items-center gap-1 shrink-0 ml-2">
                  <a
                    href="/wiki/{change.slug}/history"
                    class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200
                           text-base-content/40 hover:text-base-content transition-all"
                    title="View history"
                  >
                    <History size={13} />
                  </a>
                  <a
                    href="/wiki/{change.slug}"
                    class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200
                           text-base-content/40 hover:text-primary transition-all"
                    title="View page"
                  >
                    <ArrowRight size={13} />
                  </a>
                  {#if expandable}
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200
                             text-base-content/40 hover:text-base-content transition-all"
                      title={expandedId === change.id ? 'Hide changes' : 'Show changes'}
                      aria-expanded={expandedId === change.id}
                      aria-label={expandedId === change.id ? 'Hide changes' : 'Show changes'}
                      onclick={() => toggleExpanded(change)}
                    >
                      <ChevronDown
                        size={13}
                        class="transition-transform duration-200 {expandedId === change.id
                          ? 'rotate-180'
                          : ''}"
                      />
                    </button>
                  {/if}
                </div>
              </div>

              {#if expandable && expandedId === change.id}
                <div class="border-t border-base-200 px-4 py-3">
                  {#if loadingById[change.id]}
                    <p class="text-xs text-base-content/50">Loading changes…</p>
                  {:else if errorsById[change.id]}
                    <p class="text-xs text-error" role="alert">{errorsById[change.id]}</p>
                  {:else if diffsById[change.id]?.tooLarge}
                    <p class="text-xs text-base-content/50 italic">
                      {DIFF_TOO_LARGE_MESSAGE}
                    </p>
                  {:else if diffsById[change.id]}
                    <RevisionDiffView lines={diffsById[change.id].lines} />
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
