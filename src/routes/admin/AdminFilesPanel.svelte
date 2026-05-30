<script lang="ts">
import { tick } from 'svelte'
import { Check, Eye, PenLine, Search, Trash2, X } from 'lucide-svelte'
import { goto, invalidateAll } from '$app/navigation'
import { formatBytes, formatTimeAgo, toDatetimeAttr, formatDateTime } from '$lib/format.js'
import type { AdminDeleteTarget } from './admin-types.js'

let {
  uploads,
  onDelete
}: {
  uploads: Array<{
    filename: string
    original_name: string
    mime_type: string
    size: number
    created_at: string
  }>
  onDelete: (target: AdminDeleteTarget) => void
} = $props()

let filter = $state('')
let renameTarget = $state<string | null>(null)
let renameValue = $state('')
let renameLoading = $state(false)
let renameError = $state('')
let renameInput = $state<HTMLInputElement | null>(null)

const filtered = $derived(
  uploads.filter(
    (f) =>
      !filter ||
      f.filename.toLowerCase().includes(filter.toLowerCase()) ||
      f.original_name.toLowerCase().includes(filter.toLowerCase())
  )
)

function isImage(mime: string) {
  return mime.startsWith('image/')
}

function openRename(filename: string) {
  renameTarget = filename
  renameValue = filename
  renameError = ''
  tick().then(() => renameInput?.focus())
}

async function submitRename() {
  if (!renameTarget || !renameValue.trim() || renameValue === renameTarget) {
    renameTarget = null
    return
  }
  renameLoading = true
  renameError = ''
  try {
    const res = await fetch(`/api/admin/files/${encodeURIComponent(renameTarget)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: renameValue.trim() })
    })
    if (!res.ok) {
      const j = await res.json()
      renameError = j.error ?? 'Rename failed'
    } else {
      renameTarget = null
      await invalidateAll()
      await goto('/admin?tab=files', { keepFocus: true, noScroll: true, replaceState: true })
    }
  } finally {
    renameLoading = false
  }
}
</script>

<div class="flex items-center gap-3 mb-4">
  <div class="relative flex-1 max-w-xs">
    <Search
      size={13}
      class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none"
    />
    <input
      type="search"
      placeholder="Filter files…"
      bind:value={filter}
      class="w-full h-8 pl-8 pr-3 rounded-lg border border-base-300 bg-base-100
             text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
  </div>
</div>

<div class="rounded-xl border border-base-200 overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-base-200/60 border-b border-base-200">
        <th
          class="text-left px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >File</th
        >
        <th
          class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Type</th
        >
        <th
          class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Size</th
        >
        <th
          class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Uploaded</th
        >
        <th
          class="text-right px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider"
          >Actions</th
        >
      </tr>
    </thead>
    <tbody class="divide-y divide-base-200">
      {#each filtered as file}
        <tr class="hover:bg-base-200/30 transition-colors group">
          <td class="px-4 py-3">
            {#if renameTarget === file.filename}
              <div class="flex items-center gap-2">
                <input
                  bind:this={renameInput}
                  type="text"
                  bind:value={renameValue}
                  class="h-7 px-2 rounded border border-primary flex-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-primary/40"
                  onkeydown={(e) => {
                    if (e.key === 'Enter') submitRename()
                    if (e.key === 'Escape') renameTarget = null
                  }}
                />
                <button
                  onclick={submitRename}
                  disabled={renameLoading}
                  class="w-7 h-7 flex items-center justify-center rounded-md bg-success/10 text-success hover:bg-success/20 transition-all"
                >
                  <Check size={13} />
                </button>
                <button
                  onclick={() => (renameTarget = null)}
                  class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
              {#if renameError}<p class="text-error text-xs mt-1">{renameError}</p>{/if}
            {:else}
              <a
                href="/uploads/{file.filename}"
                target="_blank"
                class="font-medium text-base-content hover:text-primary transition-colors"
              >
                {file.filename}
              </a>
              {#if file.original_name !== file.filename}
                <div class="text-xs text-base-content/35">{file.original_name}</div>
              {/if}
            {/if}
          </td>
          <td class="px-3 py-3">
            <span class="px-2 py-0.5 rounded-md text-xs bg-base-200 text-base-content/60">
              {isImage(file.mime_type) ? '🖼 image' : file.mime_type.split('/')[1]}
            </span>
          </td>
          <td class="px-3 py-3 text-base-content/50 text-xs">{formatBytes(file.size)}</td>
          <td class="px-3 py-3 text-base-content/50 text-xs">
            <time
              datetime={toDatetimeAttr(file.created_at)}
              title={formatDateTime(file.created_at)}
            >
              {formatTimeAgo(file.created_at, 'short')}
            </time>
          </td>
          <td class="px-4 py-3">
            <div
              class="flex gap-1 justify-end opacity-100 lg:opacity-70 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
            >
              <a
                href="/uploads/{file.filename}"
                target="_blank"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 hover:text-base-content transition-all"
                title="View"><Eye size={13} /></a
              >
              <button
                onclick={() => openRename(file.filename)}
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 hover:text-base-content transition-all"
                title="Rename"><PenLine size={13} /></button
              >
              <button
                onclick={() => onDelete({ type: 'file', id: file.filename, label: file.filename })}
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error/10 text-base-content/50 hover:text-error transition-all"
                title="Delete"><Trash2 size={13} /></button
              >
            </div>
          </td>
        </tr>
      {/each}
      {#if filtered.length === 0}
        <tr
          ><td colspan="5" class="text-center py-12 text-base-content/30 text-sm"
            >No files uploaded yet.</td
          ></tr
        >
      {/if}
    </tbody>
  </table>
</div>
