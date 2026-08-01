<script lang="ts">
import { tick } from 'svelte'
import { goto, invalidateAll } from '$app/navigation'
import type { PageData, ActionData } from './$types'
import type { AdminDeleteTarget } from './admin-types.js'
import AdminHeader from './AdminHeader.svelte'
import AdminPagesPanel from './AdminPagesPanel.svelte'
import AdminFilesPanel from './AdminFilesPanel.svelte'
import AdminRecentPanel from './AdminRecentPanel.svelte'
import AdminTemplatesPanel from './AdminTemplatesPanel.svelte'
import AdminExtensionsPanel from './AdminExtensionsPanel.svelte'
import AdminUsersPanel from './AdminUsersPanel.svelte'
import AdminBackupsPanel from './AdminBackupsPanel.svelte'
import AdminDeleteDialog from './AdminDeleteDialog.svelte'

let { data, form }: { data: PageData; form: ActionData } = $props()

const tab = $derived(data.tab)

let deleteTarget = $state<AdminDeleteTarget | null>(null)
let deleteLoading = $state(false)
let deleteError = $state('')
let dialogEl = $state<HTMLDivElement | null>(null)
let cancelBtn = $state<HTMLButtonElement | null>(null)
let deleteDialogTrigger: HTMLElement | null = null

async function submitDelete() {
  if (!deleteTarget) return
  const targetTab = deleteTarget.type === 'file' ? 'files' : 'pages'
  deleteLoading = true
  deleteError = ''
  try {
    const url =
      deleteTarget.type === 'file'
        ? `/api/admin/files/${encodeURIComponent(deleteTarget.id)}`
        : `/api/pages/${encodeURIComponent(deleteTarget.id)}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (Array.isArray(body.references) && body.references.length > 0) {
        deleteError = `${body.error ?? 'Delete failed'}: ${body.references.map((ref: { title: string }) => ref.title).join(', ')}`
      } else {
        deleteError = body.error ?? 'Delete failed'
      }
      return
    }
    const trigger = deleteDialogTrigger
    deleteTarget = null
    await invalidateAll()
    await goto(`/admin?tab=${targetTab}`, { keepFocus: true, noScroll: true, replaceState: true })
    trigger?.focus()
  } finally {
    deleteLoading = false
  }
}

function openDeleteTarget(target: AdminDeleteTarget) {
  deleteTarget = target
  deleteError = ''
  deleteDialogTrigger = document.activeElement as HTMLElement
  tick().then(() => cancelBtn?.focus())
}

function closeDeleteModal() {
  deleteTarget = null
  deleteError = ''
  deleteDialogTrigger?.focus()
}
</script>

<svelte:head>
  <title>Admin — Wiki</title>
</svelte:head>

<div class="min-h-full bg-base-100">
  <AdminHeader
    {tab}
    pageCount={data.contentPageCount}
    fileCount={data.uploadCount}
    recentCount={data.recentCount}
    templateCount={data.templateCount}
    extensionCount={data.extensionCount}
    userCount={data.userCount}
  />

  <div class="px-6 py-5 lg:px-8">
    {#if tab === 'pages'}
      <AdminPagesPanel
        pages={data.pages}
        pagesTotal={data.pagesTotal}
        pagesQuery={data.pagesQuery}
        pagesPage={data.pagesPage}
        pagesPageSize={data.pagesPageSize}
        onDelete={openDeleteTarget}
      />
    {:else if tab === 'files'}
      <AdminFilesPanel uploads={data.uploads} onDelete={openDeleteTarget} />
    {:else if tab === 'recent'}
      <AdminRecentPanel recent={data.recent} revisionRetention={data.revisionRetention} {form} />
    {:else if tab === 'templates'}
      <AdminTemplatesPanel templates={data.templates} onDelete={openDeleteTarget} />
    {:else if tab === 'extensions'}
      <AdminExtensionsPanel extensions={data.extensions} {form} />
    {:else if tab === 'users'}
      <AdminUsersPanel users={data.users} currentUserId={data.user?.id ?? null} {form} />
    {:else if tab === 'backups'}
      <AdminBackupsPanel
        wikiName={data.wikiName}
        appVersion={data.appVersion}
        uploadCount={data.uploadCount}
        uploadsTotalBytes={data.uploadsTotalBytes}
        pageCount={data.contentPageCount}
      />
    {/if}
  </div>
</div>

<AdminDeleteDialog
  target={deleteTarget}
  error={deleteError}
  loading={deleteLoading}
  bind:dialogEl
  bind:cancelBtn
  onClose={closeDeleteModal}
  onConfirm={submitDelete}
/>
