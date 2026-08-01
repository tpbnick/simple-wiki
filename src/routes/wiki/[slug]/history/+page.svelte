<script lang="ts">
import { tick } from 'svelte'
import { enhance } from '$app/forms'
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
import RevisionDiffView from '$lib/components/RevisionDiffView.svelte'
import { History, Clock, ArrowLeft, RotateCcw } from 'lucide-svelte'
import type { PageData } from './$types'
import { formatDateTime, formatTimeAgo, toDatetimeAttr } from '$lib/format.js'
import {
  buildChangedLineDiff,
  DIFF_TOO_LARGE_MESSAGE,
  newerRevisionContent,
  newerRevisionTitle
} from '$lib/diff/lines.js'

let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props()

function getRevisionDiff(index: number) {
  const rev = data.revisions[index]
  const newer = newerRevisionContent(data.revisions, index, data.page.content)
  return buildChangedLineDiff(rev.content ?? '', newer ?? '')
}

function getRevisionTitleChange(index: number): { from: string; to: string } | null {
  const rev = data.revisions[index]
  const from = rev.title
  if (!from) return null
  const to = newerRevisionTitle(data.revisions, index, data.page.title)
  return from !== to ? { from, to } : null
}

let expanded = $state<number | null>(null)

let restoreTarget = $state<{
  revisionId: number
  revisionNumber: number
  summary: string
} | null>(null)
let restoreDialogEl = $state<HTMLDivElement | null>(null)
let restoreCancelBtn = $state<HTMLButtonElement | null>(null)
let restoreDialogTrigger: HTMLElement | null = null
let expectedUpdatedAt = $state('')

$effect(() => {
  expectedUpdatedAt = data.page.updated_at
})

function openRestoreModal(revisionId: number, revisionNumber: number, summary: string) {
  restoreTarget = { revisionId, revisionNumber, summary }
  restoreDialogTrigger = document.activeElement as HTMLElement
  tick().then(() => restoreCancelBtn?.focus())
}

function closeRestoreModal() {
  restoreTarget = null
  restoreDialogTrigger?.focus()
}
</script>

<svelte:head>
  <title>History: {data.page.title} — Wiki</title>
</svelte:head>

<div class="px-6 py-8 lg:px-10 max-w-3xl">
  <a
    href="/wiki/{data.page.slug}"
    class="inline-flex items-center gap-1.5 text-sm text-base-content/50 hover:text-primary transition-colors mb-6"
  >
    <ArrowLeft size={14} />
    Back to {data.page.title}
  </a>

  <div class="flex items-center gap-3 mb-8">
    <div class="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center">
      <History size={18} class="text-primary/70" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-base-content tracking-tight">Revision History</h1>
      <p class="text-sm text-base-content/50">
        {data.page.title} · {data.revisions.length}
        {data.revisions.length === 1 ? 'revision' : 'revisions'}
      </p>
    </div>
  </div>

  {#if form?.error}
    <p class="text-sm text-error mb-4" role="alert">{form.error}</p>
  {/if}

  {#if data.revisions.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
        <History size={24} class="text-base-content/30" />
      </div>
      <p class="text-base-content/50 text-sm">No revisions recorded yet.</p>
      <p class="text-base-content/35 text-xs mt-1">
        Revisions are saved each time the page is edited.
      </p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each data.revisions as rev, i}
        <div class="wiki-card overflow-hidden">
          <button
            type="button"
            class="w-full flex items-start justify-between p-4 text-left gap-3"
            aria-expanded={expanded === rev.id}
            onclick={() => (expanded = expanded === rev.id ? null : rev.id)}
          >
            <div class="flex items-start gap-3 min-w-0">
              <div
                class="w-7 h-7 rounded-full bg-base-200 flex items-center justify-center shrink-0 mt-0.5"
              >
                <RotateCcw size={12} class="text-base-content/40" />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-sm text-base-content">
                  {rev.summary || 'No summary'}
                </p>
                <p class="text-xs text-base-content/40 flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  <time
                    datetime={toDatetimeAttr(rev.created_at)}
                    title={formatDateTime(rev.created_at)}
                  >
                    {formatTimeAgo(rev.created_at)}
                  </time>
                  <span class="text-base-content/20 mx-1">·</span>
                  {formatDateTime(rev.created_at)}
                </p>
              </div>
            </div>
            <span class="text-xs text-base-content/30 shrink-0 mt-1">
              #{data.revisions.length - i}
            </span>
          </button>

          {#if expanded === rev.id}
            {@const diff = getRevisionDiff(i)}
            {@const titleChange = getRevisionTitleChange(i)}
            <div class="border-t border-base-200 px-4 py-3 space-y-3">
              <p class="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-base-content/40">
                Changes in this edit
              </p>
              {#if titleChange}
                <p class="text-xs text-base-content/70">
                  Title renamed:
                  <span class="line-through text-base-content/50">{titleChange.from}</span>
                  →
                  <span class="font-medium text-base-content">{titleChange.to}</span>
                </p>
              {/if}
              {#if diff.tooLarge}
                <p class="text-xs text-base-content/50 italic">
                  {DIFF_TOO_LARGE_MESSAGE}
                </p>
              {:else if diff.lines.length > 0}
                <RevisionDiffView lines={diff.lines} />
              {:else if !titleChange}
                <p class="text-xs text-base-content/50 italic">
                  No content or title changes recorded.
                </p>
              {/if}
              {#if data.canEdit}
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium
                         bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  onclick={() =>
                    openRestoreModal(
                      rev.id,
                      data.revisions.length - i,
                      rev.summary || 'No summary'
                    )}
                >
                  <RotateCcw size={12} />
                  Restore this version
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Restore confirmation modal ──────────────────────────────────── -->
<ConfirmDialog
  open={restoreTarget !== null}
  title="Restore this version"
  titleId="restore-dialog-title"
  bind:dialogEl={restoreDialogEl}
  bind:cancelBtn={restoreCancelBtn}
  onClose={closeRestoreModal}
>
  {#if restoreTarget}
    <p class="text-sm text-base-content/80 leading-relaxed">
      Make revision <strong class="text-base-content">#{restoreTarget.revisionNumber}</strong>
      the current page?
    </p>
    <p class="text-sm text-base-content/60 leading-relaxed mt-3">
      This restores the page to how it looked <strong class="font-medium text-base-content/75"
        >after</strong
      >
      this edit — the result of the changes shown above, not the version before them.
    </p>
    {#if restoreTarget.summary}
      <p class="text-xs text-base-content/45 mt-3">
        Edit summary: {restoreTarget.summary}
      </p>
    {/if}
  {/if}
  {#snippet actions()}
    <form
      method="POST"
      action="?/restore"
      use:enhance={() => {
        return async ({ update }) => {
          closeRestoreModal()
          await update()
        }
      }}
    >
      <input type="hidden" name="revisionId" value={restoreTarget?.revisionId ?? ''} />
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      <input
        type="hidden"
        name="summary"
        value="Restored version #{restoreTarget?.revisionNumber ?? ''}"
      />
      <button
        type="submit"
        class="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-content
               hover:bg-primary/90 transition-colors"
      >
        Restore
      </button>
    </form>
  {/snippet}
</ConfirmDialog>
