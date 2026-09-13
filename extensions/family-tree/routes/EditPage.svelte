<script lang="ts">
import { beforeNavigate } from '$app/navigation'
import { onMount } from 'svelte'
import EditConflictBanner from '$lib/components/EditConflictBanner.svelte'
import FamilyTreeCanvas from '../components/FamilyTreeCanvas.svelte'
import FamilyTreeEditor from '../components/FamilyTreeEditor.svelte'
import type { FamilyTreeData } from '../lib/types.js'
import type { FamilyTreeRecord } from '../db.js'
import type { EditPageData } from './types.js'
import { ArrowLeft, Save } from 'lucide-svelte'

const SIDEBAR_WIDTH_KEY = 'wiki-family-tree-sidebar-width'
const SIDEBAR_MIN = 240
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 288

let { data }: { data: EditPageData } = $props()

let title = $state('')
let treeData = $state<FamilyTreeData>({ rootId: '', people: {} })
let treeUpdatedAt = $state('')
let conflictUpdatedAt = $state<string | null>(null)
let selectedId = $state<string | null>(null)
let saving = $state(false)
let dirty = $state(false)
let saveError = $state('')
let sidebarWidth = $state(SIDEBAR_DEFAULT)
let resizing = $state(false)
let workspaceEl = $state<HTMLDivElement | null>(null)
let resizeMoveHandler: ((event: PointerEvent) => void) | null = null
let resizeUpHandler: (() => void) | null = null
let loadedSlug = $state<string | null>(null)

function cleanupResizeListeners() {
  if (resizeMoveHandler) {
    window.removeEventListener('pointermove', resizeMoveHandler)
    resizeMoveHandler = null
  }
  if (resizeUpHandler) {
    window.removeEventListener('pointerup', resizeUpHandler)
    resizeUpHandler = null
  }
  resizing = false
}

onMount(() => {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    const parsed = stored ? Number(stored) : NaN
    if (Number.isFinite(parsed)) sidebarWidth = clampSidebarWidth(parsed)
  } catch {
    // localStorage may be unavailable
  }
  return cleanupResizeListeners
})

function startSidebarResize(event: PointerEvent) {
  event.preventDefault()
  cleanupResizeListeners()
  resizing = true
  const startX = event.clientX
  const startWidth = sidebarWidth

  resizeMoveHandler = (moveEvent: PointerEvent) => {
    sidebarWidth = clampSidebarWidth(startWidth + (startX - moveEvent.clientX))
  }
  resizeUpHandler = () => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
    } catch {
      // ignore quota / private mode
    }
    cleanupResizeListeners()
  }

  window.addEventListener('pointermove', resizeMoveHandler)
  window.addEventListener('pointerup', resizeUpHandler)
}

function clampSidebarWidth(width: number): number {
  const workspaceWidth = workspaceEl?.clientWidth ?? 0
  const max =
    workspaceWidth > 0 ? Math.min(SIDEBAR_MAX, Math.round(workspaceWidth * 0.55)) : SIDEBAR_MAX
  return Math.min(max, Math.max(SIDEBAR_MIN, Math.round(width)))
}

function applyTree(tree: FamilyTreeRecord) {
  title = tree.title
  treeData = structuredClone(tree.data)
  treeUpdatedAt = tree.updated_at
  conflictUpdatedAt = null
  selectedId = tree.data.rootId
  dirty = false
  saveError = ''
  loadedSlug = tree.slug
}

$effect.pre(() => {
  const tree = data.tree
  if (loadedSlug === tree.slug && dirty) return
  applyTree(tree)
})

function markDirty(next: FamilyTreeData) {
  treeData = next
  dirty = true
  saveError = ''
  conflictUpdatedAt = null
}

async function saveTree(forceUpdatedAt?: string) {
  saving = true
  saveError = ''
  try {
    const response = await fetch(`/api/family-tree/${data.tree.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        data: treeData,
        expectedUpdatedAt: forceUpdatedAt ?? treeUpdatedAt
      })
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 409 && payload?.expectedUpdatedAt) {
        conflictUpdatedAt = String(payload.expectedUpdatedAt)
      }
      throw new Error(payload?.error ?? payload?.message ?? 'Save failed')
    }
    treeUpdatedAt = payload.updated_at
    conflictUpdatedAt = null
    dirty = false
  } catch (err) {
    saveError = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving = false
  }
}

async function discardConflictAndReload() {
  if (!confirm('Discard your unsaved changes and load the latest version?')) return
  saving = true
  saveError = ''
  try {
    const response = await fetch(`/api/family-tree/${data.tree.slug}`)
    if (!response.ok) throw new Error('Could not reload tree')
    applyTree((await response.json()) as FamilyTreeRecord)
  } catch (err) {
    saveError = err instanceof Error ? err.message : 'Reload failed'
  } finally {
    saving = false
  }
}

function overwriteWithMyChanges() {
  if (!conflictUpdatedAt) return
  const stamp = conflictUpdatedAt
  conflictUpdatedAt = null
  void saveTree(stamp)
}

beforeNavigate(({ cancel }) => {
  if (!data.canEdit || saving) return
  if (dirty && !confirm('You have unsaved changes. Leave anyway?')) cancel()
})

$effect(() => {
  if (!dirty || !data.canEdit) return
  const handler = (event: BeforeUnloadEvent) => event.preventDefault()
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
})
</script>

<svelte:head>
  <title>{title} — Family tree</title>
</svelte:head>

<div class="ft-page">
  <header class="ft-toolbar">
    <a href="/family-tree" class="btn btn-ghost btn-sm">
      <ArrowLeft size={14} />
      All trees
    </a>

    {#if data.canEdit}
      <input
        type="text"
        bind:value={title}
        oninput={() => (dirty = true)}
        class="ft-toolbar__title"
        aria-label="Tree title"
      />
      <button
        type="button"
        class="btn btn-primary btn-sm"
        disabled={!dirty || saving || !!conflictUpdatedAt}
        onclick={() => saveTree()}
      >
        <Save size={14} />
        {saving ? 'Saving…' : 'Save'}
      </button>
    {:else}
      <h1 class="text-lg font-semibold truncate">{title}</h1>
    {/if}
  </header>

  {#if conflictUpdatedAt}
    <div class="ft-conflict">
      <EditConflictBanner
        {saving}
        noun="tree"
        onReload={discardConflictAndReload}
        onOverwrite={overwriteWithMyChanges}
      />
    </div>
  {:else if saveError}
    <p class="ft-save-error" role="alert">{saveError}</p>
  {/if}

  <div class="ft-workspace" class:ft-workspace--resizing={resizing} bind:this={workspaceEl}>
    <div class="ft-workspace__canvas">
      <FamilyTreeCanvas
        data={treeData}
        existingPageSlugs={data.existingPageSlugs}
        fitOnLoad
        canEdit={data.canEdit}
        {selectedId}
        onselect={(id) => (selectedId = id)}
      />
    </div>

    {#if data.canEdit && selectedId}
      <div
        class="ft-splitter"
        class:ft-splitter--active={resizing}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={SIDEBAR_MIN}
        aria-valuemax={SIDEBAR_MAX}
        aria-valuenow={sidebarWidth}
        onpointerdown={startSidebarResize}
      ></div>

      <div class="ft-editor-panel" style:width="{sidebarWidth}px">
        <FamilyTreeEditor
          data={treeData}
          personId={selectedId}
          onchange={(next) => {
            markDirty(next)
            if (!selectedId || !next.people[selectedId]) selectedId = next.rootId
          }}
        />
      </div>
    {/if}
  </div>
</div>
