<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { onMount } from 'svelte'
  import { createFamilyTree } from '$lib/family-tree/create-tree.js'
  import {
    findInfoboxInContent,
    replaceInfoboxInContent,
    removeInfoboxFromContent,
    createDefaultInfobox
  } from '$lib/templates/infobox-editor.js'
  import type { InfoboxData } from '$lib/templates/infobox-editor.js'
  import {
    findAllImageBoxesInContent,
    replaceImageBoxInContent,
    removeImageBoxFromContent,
    createDefaultImageBox,
    serializeImageBox
  } from '$lib/templates/imagebox-editor.js'
  import type { ImageBoxData } from '$lib/templates/imagebox-editor.js'
  import { buildPreviewContent } from '$lib/wiki-edit/preview-content.js'
  import { createMarkdownToolbarActions } from '$lib/wiki-edit/toolbar-actions.js'
  import {
    wrapSelection,
    insertAtSelection,
    handleTabKey
  } from '$lib/wiki-edit/text-editing.js'
  import { uploadFileToWiki, markdownForUpload } from '$lib/wiki-edit/upload.js'
  import type { PageData, ActionData } from './$types'
  import WikiEditHeader from './WikiEditHeader.svelte'
  import WikiEditToolbar from './WikiEditToolbar.svelte'
  import WikiEditMarkdownPane from './WikiEditMarkdownPane.svelte'
  import WikiEditPreviewPane from './WikiEditPreviewPane.svelte'
  import WikiEditSaveBar from './WikiEditSaveBar.svelte'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  const editKey = $derived(data.isNew ? (data.slug === 'new' ? 'new' : data.slug) : (data.page?.slug ?? ''))
  const baseline = $derived({
    title: data.page?.title ?? data.defaultTitle ?? '',
    content: data.page?.content ?? '',
    namespace: data.page?.namespace ?? data.defaultNamespace ?? 'article'
  })

  let title = $state('')
  let content = $state('')
  let summary = $state('')
  let namespace = $state('article')
  let previewHtml = $state('')
  let showPreview = $state(false)
  let infoboxEditorActive = $state(false)
  let showInfoboxAddMenu = $state(false)
  let showFamilyTreeMenu = $state(false)
  let newFamilyTreeTitle = $state('')
  let creatingFamilyTree = $state(false)
  let familyTreeError = $state('')
  let previewLoading = $state(false)
  let previewError = $state('')

  let textarea = $state<HTMLTextAreaElement | undefined>(undefined)
  let fileInput = $state<HTMLInputElement | null>(null)
  let uploadError = $state('')
  let uploading = $state(false)
  let dragOver = $state(false)
  let infoboxUploading = $state(false)
  let infoboxUploadingEntryIndex = $state<number | null>(null)
  let imageBoxDataById = $state<Record<string, ImageBoxData>>({})
  let imageBoxSyncPaused = $state(false)
  let imageBoxUploading = $state(false)
  let imageBoxUploadingBoxId = $state<string | null>(null)
  let imageBoxUploadingItemIndex = $state<number | null>(null)
  let saving = $state(false)
  let allowNavigation = $state(false)
  let previewEnabled = $state(false)
  let expectedUpdatedAt = $state('')
  let previewAbort: AbortController | null = null
  let previewRequestId = 0

  let infoboxData = $state<InfoboxData | null>(null)
  let infoboxSyncPaused = $state(false)

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 768px)').matches
    const savedPreview = localStorage.getItem('wiki-preview-pane')
    showPreview = savedPreview !== null ? savedPreview === '1' : desktop
    previewEnabled = true

    return () => {
      clearTimeout(debounceTimer)
      previewAbort?.abort()
    }
  })

  $effect(() => {
    editKey
    title = baseline.title
    content = baseline.content
    namespace = baseline.namespace
    summary = ''
    expectedUpdatedAt = data.page?.updated_at ?? ''
    allowNavigation = false

    const match = findInfoboxInContent(baseline.content)
    infoboxData = match?.data ?? null
    infoboxEditorActive = match !== null
    infoboxSyncPaused = false

    imageBoxDataById = Object.fromEntries(
      findAllImageBoxesInContent(baseline.content).map((box) => [box.data.id, box.data])
    )
    imageBoxSyncPaused = false

    previewAbort?.abort()
    previewHtml = ''
    previewError = ''
    schedulePreview()
  })

  const isDirty = $derived(
    title !== baseline.title ||
      content !== baseline.content ||
      namespace !== baseline.namespace
  )

  const hasFamilyTreeTool = $derived(data.editorTools.some((tool) => tool.id === 'family-tree'))
  const infoboxMatch = $derived(findInfoboxInContent(content))
  const hasInfoboxInContent = $derived(infoboxMatch !== null)
  const imageBoxMatches = $derived(findAllImageBoxesInContent(content))
  const hasImageBoxEditors = $derived(imageBoxMatches.length > 0)

  $effect(() => {
    if (!form?.error) return
    const payload = form as Record<string, unknown>
    if (payload.title !== undefined) title = String(payload.title)
    if (payload.content !== undefined) content = String(payload.content)
    if (payload.namespace !== undefined) namespace = String(payload.namespace)
    if (payload.summary !== undefined) summary = String(payload.summary)
    if (payload.expectedUpdatedAt) expectedUpdatedAt = String(payload.expectedUpdatedAt)
    schedulePreview()
  })

  beforeNavigate(({ cancel }) => {
    if (allowNavigation || saving) return
    if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel()
    }
  })

  $effect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  })

  $effect(() => {
    if (!infoboxEditorActive) return

    if (!infoboxMatch) {
      infoboxData = null
      infoboxEditorActive = false
      infoboxSyncPaused = false
      return
    }

    if (infoboxSyncPaused) return

    infoboxData = infoboxMatch.data
  })

  $effect(() => {
    if (imageBoxSyncPaused) return

    const next: Record<string, ImageBoxData> = {}
    for (const match of findAllImageBoxesInContent(content)) {
      next[match.data.id] = match.data
    }
    imageBoxDataById = next
  })

  const editorPlaceholder =
    'Start writing… use [[links]], {{Infobox|…}}, {{ImageBox|…}}, {{FamilyTree|family=…}}, and standard Markdown'

  let debounceTimer: ReturnType<typeof setTimeout>

  function schedulePreview() {
    if (!previewEnabled || !showPreview) return
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchPreview, 400)
  }

  function setContent(next: string) {
    content = next
    schedulePreview()
  }

  async function fetchPreview() {
    if (!showPreview) return
    previewAbort?.abort()
    previewAbort = new AbortController()
    const { signal } = previewAbort
    const requestId = ++previewRequestId

    previewLoading = true
    previewError = ''
    try {
      const previewContent = buildPreviewContent(content, {
        stripInfobox: infoboxEditorActive,
        stripImageBoxes: hasImageBoxEditors
      })
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: previewContent }),
        signal
      })
      if (signal.aborted || requestId !== previewRequestId) return
      if (!res.ok) {
        previewError = res.status === 401 ? 'Session expired — please log in again.' : 'Preview failed'
        return
      }
      const { html } = await res.json()
      if (signal.aborted || requestId !== previewRequestId) return
      previewHtml = html
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (signal.aborted || requestId !== previewRequestId) return
      previewError = 'Preview failed — check your connection.'
    } finally {
      if (requestId === previewRequestId) {
        previewLoading = false
      }
    }
  }

  $effect(() => {
    if (previewEnabled && showPreview) schedulePreview()
  })

  async function uploadFile(file: File): Promise<string | null> {
    const result = await uploadFileToWiki(file)
    if ('error' in result) {
      uploadError = result.error
      return null
    }
    return result.url
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files?.length || !textarea) return
    uploadError = ''
    uploading = true

    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile(file)
        if (!url) continue
        insertAt('\n' + markdownForUpload(file, url) + '\n')
      } catch {
        uploadError = 'Upload failed — check the console'
      }
    }

    uploading = false
  }

  async function handleInfoboxImageUpload(files: FileList | null, entryIndex: number) {
    const file = files?.[0]
    if (!file || !infoboxData) return

    const entry = infoboxData.entries[entryIndex]
    if (!entry || entry.type !== 'image') return

    infoboxUploading = true
    infoboxUploadingEntryIndex = entryIndex
    uploadError = ''

    try {
      const url = await uploadFile(file)
      if (!url) return

      const entries = infoboxData.entries.map((existing, index) =>
        index === entryIndex && existing.type === 'image'
          ? { ...existing, image: url }
          : existing
      )
      updateInfobox({ ...infoboxData, entries })
    } finally {
      infoboxUploading = false
      infoboxUploadingEntryIndex = null
    }
  }

  async function handleImageBoxUpload(boxId: string, itemIndex: number, files: FileList | null) {
    const file = files?.[0]
    const box = imageBoxDataById[boxId]
    if (!file || !box) return

    const item = box.images[itemIndex]
    if (!item) return

    imageBoxUploading = true
    imageBoxUploadingBoxId = boxId
    imageBoxUploadingItemIndex = itemIndex
    uploadError = ''

    try {
      const url = await uploadFile(file)
      if (!url) return

      const images = box.images.map((existing, index) =>
        index === itemIndex ? { ...existing, image: url } : existing
      )
      updateImageBox(boxId, { ...box, images })
    } finally {
      imageBoxUploading = false
      imageBoxUploadingBoxId = null
      imageBoxUploadingItemIndex = null
    }
  }

  function updateImageBox(id: string, next: ImageBoxData) {
    imageBoxSyncPaused = true
    imageBoxDataById = { ...imageBoxDataById, [id]: next }
    setContent(replaceImageBoxInContent(content, id, next))
  }

  function insertImageBox() {
    const box = createDefaultImageBox()
    imageBoxSyncPaused = true
    showPreview = true
    localStorage.setItem('wiki-preview-pane', '1')
    imageBoxDataById = { ...imageBoxDataById, [box.id]: box }
    insertAt(`\n${serializeImageBox(box)}\n`)
  }

  function removeImageBox(id: string) {
    imageBoxSyncPaused = true
    const { [id]: _removed, ...rest } = imageBoxDataById
    imageBoxDataById = rest
    setContent(removeImageBoxFromContent(content, id))
    imageBoxSyncPaused = false
  }

  function updateInfobox(next: InfoboxData) {
    infoboxSyncPaused = true
    infoboxData = next
    setContent(replaceInfoboxInContent(content, next))
  }

  function insertInfobox(variant?: string) {
    if (infoboxData) return
    infoboxSyncPaused = true
    infoboxData = createDefaultInfobox(variant)
    infoboxEditorActive = true
    showPreview = true
    localStorage.setItem('wiki-preview-pane', '1')
    setContent(replaceInfoboxInContent(content, infoboxData))
  }

  function removeInfobox() {
    infoboxSyncPaused = false
    infoboxData = null
    infoboxEditorActive = false
    setContent(removeInfoboxFromContent(content))
  }

  function closeFamilyTreeMenu() {
    showFamilyTreeMenu = false
    familyTreeError = ''
  }

  function insertFamilyTreeEmbed(slug: string) {
    insertAt(`\n{{FamilyTree|family=${slug}}}\n`)
    closeFamilyTreeMenu()
  }

  async function createAndInsertFamilyTree() {
    const trimmed = newFamilyTreeTitle.trim()
    if (!trimmed) return

    creatingFamilyTree = true
    familyTreeError = ''

    try {
      const payload = await createFamilyTree(trimmed)
      newFamilyTreeTitle = ''
      insertFamilyTreeEmbed(payload.slug)
    } catch (err) {
      familyTreeError = err instanceof Error ? err.message : 'Could not create family tree'
    } finally {
      creatingFamilyTree = false
    }
  }

  function handleToolbarMenuClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    if (!target?.closest('.infobox-toolbar-wrap')) {
      showInfoboxAddMenu = false
    }
    if (!target?.closest('.family-tree-toolbar-wrap')) {
      closeFamilyTreeMenu()
    }
  }

  function handleContentInput() {
    infoboxSyncPaused = false
    imageBoxSyncPaused = false
    schedulePreview()
  }

  function wrap(before: string, after = before, placeholder = 'text') {
    if (!textarea) return
    wrapSelection(textarea, content, setContent, before, after, placeholder)
  }

  function insertAt(text: string) {
    if (!textarea) return
    insertAtSelection(textarea, content, setContent, text)
  }

  function handleTab(e: KeyboardEvent) {
    if (!textarea) return
    handleTabKey(e, textarea, content, setContent)
  }

  function togglePreview() {
    showPreview = !showPreview
    localStorage.setItem('wiki-preview-pane', showPreview ? '1' : '0')
  }

  const toolbarActions = createMarkdownToolbarActions({ wrap, insertAt })

  const cancelHref = $derived(data.isNew && data.slug === 'new' ? '/' : `/wiki/${data.slug}`)

  const saveEnhance = ({ formData }: { formData: FormData }) => {
    saving = true
    formData.set('title', title)
    formData.set('content', content)
    formData.set('namespace', namespace)
    formData.set('expectedUpdatedAt', expectedUpdatedAt)
    return async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
      try {
        if (result.type === 'redirect') {
          allowNavigation = true
        }
        await update()
      } finally {
        saving = false
      }
    }
  }
</script>

<svelte:head>
  <title>{data.isNew ? (data.defaultTitle || 'New page') : `Editing: ${data.page?.title}`} — Wiki</title>
</svelte:head>

<input
  bind:this={fileInput}
  type="file"
  class="hidden"
  multiple
  accept="image/*,application/pdf,text/plain,.csv,.zip,.json,video/*,audio/*"
  onchange={(e) => handleFileUpload(e.currentTarget.files)}
/>

<svelte:window onclick={handleToolbarMenuClick} />

<div class="flex flex-col h-[calc(100vh-3.5rem)]">
  <WikiEditHeader
    bind:title
    bind:namespace
    {showPreview}
    onTogglePreview={togglePreview}
  />

  <WikiEditToolbar
    {toolbarActions}
    {hasInfoboxInContent}
    bind:showInfoboxAddMenu
    bind:showFamilyTreeMenu
    {hasFamilyTreeTool}
    familyTrees={data.familyTrees}
    bind:newFamilyTreeTitle
    {creatingFamilyTree}
    {familyTreeError}
    {uploading}
    {uploadError}
    onInsertInfobox={insertInfobox}
    onInsertImageBox={insertImageBox}
    onInsertFamilyTree={insertFamilyTreeEmbed}
    onCreateFamilyTree={createAndInsertFamilyTree}
    onUploadClick={() => fileInput?.click()}
    onCloseFamilyTreeMenu={closeFamilyTreeMenu}
  />

  <div class="flex flex-1 min-h-0 flex-col md:flex-row">
    <WikiEditMarkdownPane
      bind:content
      bind:textarea
      bind:dragOver
      {showPreview}
      placeholder={editorPlaceholder}
      onInput={handleContentInput}
      onKeydown={handleTab}
      onFileDrop={handleFileUpload}
    />

    {#if showPreview}
      <WikiEditPreviewPane
        {previewLoading}
        {previewError}
        {previewHtml}
        {infoboxEditorActive}
        {infoboxData}
        {infoboxUploading}
        {infoboxUploadingEntryIndex}
        {imageBoxMatches}
        {imageBoxDataById}
        {imageBoxUploading}
        {imageBoxUploadingBoxId}
        {imageBoxUploadingItemIndex}
        onUpdateInfobox={updateInfobox}
        onRemoveInfobox={removeInfobox}
        onInfoboxUpload={handleInfoboxImageUpload}
        onUpdateImageBox={updateImageBox}
        onRemoveImageBox={removeImageBox}
        onImageBoxUpload={handleImageBoxUpload}
      />
    {/if}
  </div>

  <WikiEditSaveBar
    bind:summary
    bind:saving
    formError={form?.error}
    {cancelHref}
    isNew={data.isNew}
    onEnhance={saveEnhance}
  />
</div>
