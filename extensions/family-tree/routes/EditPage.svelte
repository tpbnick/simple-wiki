<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { onMount } from 'svelte'
  import FamilyTreeCanvas from '../components/FamilyTreeCanvas.svelte'
  import FamilyTreeEditor from '../components/FamilyTreeEditor.svelte'
  import type { FamilyTreeData } from '../lib/types.js'
  import type { EditPageData } from './types.js'
  import { ArrowLeft, Save } from 'lucide-svelte'

  const SIDEBAR_WIDTH_KEY = 'wiki-family-tree-sidebar-width'
  const SIDEBAR_MIN = 240
  const SIDEBAR_MAX = 480
  const SIDEBAR_DEFAULT = 288

  let { data }: { data: EditPageData } = $props()

  const emptyTreeData = (): FamilyTreeData => ({ rootId: '', people: {} })

  let title = $state('')
  let treeData = $state<FamilyTreeData>(emptyTreeData())
  let treeUpdatedAt = $state('')
  let selectedId = $state<string | null>(null)
  let saving = $state(false)
  let dirty = $state(false)
  let saveError = $state('')
  let sidebarWidth = $state(SIDEBAR_DEFAULT)
  let resizing = $state(false)
  let workspaceEl = $state<HTMLDivElement | null>(null)
  let resizeMoveHandler: ((event: PointerEvent) => void) | null = null
  let resizeUpHandler: (() => void) | null = null

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
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (stored) {
      const parsed = Number(stored)
      if (Number.isFinite(parsed)) sidebarWidth = clampSidebarWidth(parsed)
    }

    return () => {
      cleanupResizeListeners()
    }
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
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
      cleanupResizeListeners()
    }

    window.addEventListener('pointermove', resizeMoveHandler)
    window.addEventListener('pointerup', resizeUpHandler)
  }

  function clampSidebarWidth(width: number): number {
    const workspaceWidth = workspaceEl?.clientWidth ?? 0
    const max = workspaceWidth > 0 ? Math.min(SIDEBAR_MAX, Math.round(workspaceWidth * 0.55)) : SIDEBAR_MAX
    return Math.min(max, Math.max(SIDEBAR_MIN, Math.round(width)))
  }

  function personExists(id: string | null, next: FamilyTreeData): boolean {
    return !!id && !!next.people[id]
  }

  $effect.pre(() => {
    data.tree
    title = data.tree.title
    treeData = structuredClone(data.tree.data)
    treeUpdatedAt = data.tree.updated_at
    selectedId = data.tree.data.rootId
    dirty = false
    saveError = ''
  })

  function markDirty(next: FamilyTreeData) {
    treeData = next
    dirty = true
    saveError = ''
  }

  async function saveTree() {
    saving = true
    saveError = ''

    try {
      const response = await fetch(`/api/family-tree/${data.tree.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          data: treeData,
          expectedUpdatedAt: treeUpdatedAt
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        if (payload?.expectedUpdatedAt) treeUpdatedAt = String(payload.expectedUpdatedAt)
        throw new Error(payload?.error ?? payload?.message ?? 'Save failed')
      }

      const saved = await response.json()
      treeUpdatedAt = saved.updated_at
      dirty = false
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Save failed'
    } finally {
      saving = false
    }
  }

  beforeNavigate(({ cancel }) => {
    if (!data.canEdit || saving) return
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel()
    }
  })

  $effect(() => {
    if (!dirty || !data.canEdit) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
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
      <button type="button" class="btn btn-primary btn-sm" disabled={!dirty || saving} onclick={saveTree}>
        <Save size={14} />
        {saving ? 'Saving…' : 'Save'}
      </button>
      {#if saveError}
        <p class="text-xs text-error">{saveError}</p>
      {/if}
    {:else}
      <h1 class="text-lg font-semibold truncate">{title}</h1>
    {/if}
  </header>

  <div class="ft-workspace" class:ft-workspace--resizing={resizing} bind:this={workspaceEl}>
    <div class="ft-workspace__canvas">
      <FamilyTreeCanvas
        data={treeData}
        existingPageSlugs={data.existingPageSlugs}
        fitOnLoad
        canEdit={data.canEdit}
        selectedId={selectedId}
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
            if (!personExists(selectedId, next)) {
              selectedId = next.rootId
            }
          }}
        />
      </div>
    {/if}
  </div>
</div>
