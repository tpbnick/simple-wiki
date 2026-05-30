<script lang="ts">
import { invalidateAll } from '$app/navigation'
import { Download, FileText, Upload } from 'lucide-svelte'
import { formatDateTime } from '$lib/format.js'

let {
  wikiName,
  appVersion,
  uploadCount,
  pageCount
}: {
  wikiName: string
  appVersion: string
  uploadCount: number
  pageCount: number
} = $props()

let includeUploadsInBackup = $state(false)
let includeMarkdownInBackup = $state(false)
let restoreUploadsOnImport = $state(false)
let importConfirm = $state(false)
let importLoading = $state(false)
let importError = $state('')
let importSuccess = $state<{
  wikiName: string
  wikiVersion: string
  createdAt: string
  includesUploads: boolean
  includesMarkdown: boolean
} | null>(null)
let importWarnings = $state<string[]>([])
let importInput = $state<HTMLInputElement | null>(null)

const backupDownloadUrl = $derived.by(() => {
  const params = new URLSearchParams()
  if (includeUploadsInBackup) params.set('includeUploads', '1')
  if (includeMarkdownInBackup) params.set('includeMarkdown', '1')
  const query = params.toString()
  return query ? `/api/admin/backup?${query}` : '/api/admin/backup'
})

async function submitImport() {
  importError = ''
  importSuccess = null
  importWarnings = []
  const file = importInput?.files?.[0]
  if (!file) {
    importError = 'Choose a backup zip file first'
    return
  }
  if (!importConfirm) {
    importError = 'Confirm that you want to replace the current database'
    return
  }

  importLoading = true
  try {
    const body = new FormData()
    body.set('backup', file)
    if (restoreUploadsOnImport) body.set('restoreUploads', 'on')
    const res = await fetch('/api/admin/backup', { method: 'POST', body })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      const raw = payload.error ?? payload.message ?? 'Import failed'
      importError =
        typeof raw === 'string' && raw.includes('BODY_SIZE_LIMIT')
          ? 'Backup file is too large for the server upload limit. Set BODY_SIZE_LIMIT=500M (or higher) and restart the container.'
          : raw
      return
    }
    importSuccess = payload.manifest
    importWarnings = Array.isArray(payload.warnings) ? payload.warnings : []
    importConfirm = false
    if (importInput) importInput.value = ''
    await invalidateAll()
  } finally {
    importLoading = false
  }
}
</script>

<div class="grid gap-6 lg:grid-cols-2">
  <section class="rounded-xl border border-base-200 p-5">
    <div class="flex items-start gap-3 mb-4">
      <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Download size={16} class="text-primary" />
      </div>
      <div>
        <h2 class="font-semibold text-base-content">Download backup</h2>
        <p class="text-sm text-base-content/60 mt-1">
          Creates a zip with <code class="text-xs bg-base-200 px-1 py-0.5 rounded">wiki.db</code>,
          <code class="text-xs bg-base-200 px-1 py-0.5 rounded">manifest.txt</code>, and optional
          uploads or raw markdown exports.
        </p>
      </div>
    </div>
    <dl class="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-5">
      <dt class="text-base-content/50">Wiki</dt>
      <dd class="font-medium">{wikiName}</dd>
      <dt class="text-base-content/50">App version</dt>
      <dd class="font-medium">{appVersion}</dd>
    </dl>
    <div class="space-y-3 mb-5">
      <label class="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          bind:checked={includeUploadsInBackup}
          class="checkbox checkbox-sm mt-0.5"
        />
        <span class="text-base-content/70">
          Include uploaded files ({uploadCount} on disk)
        </span>
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          bind:checked={includeMarkdownInBackup}
          class="checkbox checkbox-sm mt-0.5"
        />
        <span class="text-base-content/70">
          <span class="inline-flex items-center gap-1.5">
            <FileText size={13} class="text-base-content/45" />
            Include markdown folder ({pageCount} pages)
          </span>
          <span class="block text-xs text-base-content/45 mt-0.5">
            Exports raw page content under <code class="font-mono bg-base-200 px-1 rounded"
              >markdown/</code
            > with YAML frontmatter.
          </span>
        </span>
      </label>
    </div>
    <a
      href={backupDownloadUrl}
      class="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
             bg-primary text-primary-content hover:bg-primary/90 transition-colors"
    >
      <Download size={14} />
      Download backup
    </a>
  </section>

  <section class="rounded-xl border border-base-200 p-5">
    <div class="flex items-start gap-3 mb-4">
      <div class="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
        <Upload size={16} class="text-warning" />
      </div>
      <div>
        <h2 class="font-semibold text-base-content">Import backup</h2>
        <p class="text-sm text-base-content/60 mt-1">
          Replaces the current database with the one from a backup zip. Uploaded files can be
          restored separately.
        </p>
      </div>
    </div>

    {#if importSuccess}
      <div class="alert alert-success mb-4 text-sm">
        <p>
          Backup imported from <strong>{importSuccess.wikiName}</strong> (app {importSuccess.wikiVersion}).
        </p>
        <p class="text-xs mt-1 opacity-80">
          Created {formatDateTime(importSuccess.createdAt)}
          {#if importSuccess.includesUploads}
            · backup included uploads
          {/if}
          {#if importSuccess.includesMarkdown}
            · backup included markdown export
          {/if}
        </p>
      </div>
    {/if}

    {#if importWarnings.length > 0}
      <div class="alert alert-warning mb-4 text-sm">
        {#each importWarnings as warning}
          <p>{warning}</p>
        {/each}
      </div>
    {/if}

    {#if importError}
      <p class="text-error text-sm mb-4" role="alert">{importError}</p>
    {/if}

    <div class="space-y-4">
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-base-content/70">Backup zip</span>
        <input
          bind:this={importInput}
          type="file"
          accept=".zip,application/zip"
          class="file-input file-input-bordered file-input-sm w-full max-w-md"
        />
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          bind:checked={restoreUploadsOnImport}
          class="checkbox checkbox-sm mt-0.5"
        />
        <span class="text-base-content/70">
          Restore uploaded files from backup (when present in the zip)
        </span>
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input type="checkbox" bind:checked={importConfirm} class="checkbox checkbox-sm mt-0.5" />
        <span class="text-base-content/70">
          I understand this will replace the current wiki database
          {#if restoreUploadsOnImport}
            and uploaded files
          {/if}. This cannot be undone.
        </span>
      </label>
      <button
        type="button"
        onclick={submitImport}
        disabled={importLoading}
        class="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
               bg-warning text-warning-content hover:bg-warning/90 transition-colors disabled:opacity-50"
      >
        <Upload size={14} />
        {importLoading ? 'Importing…' : 'Import backup'}
      </button>
    </div>
  </section>
</div>
