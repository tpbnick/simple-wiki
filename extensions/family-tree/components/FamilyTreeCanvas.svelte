<script lang="ts">
  import { layoutFamilyTree } from '../lib/layout.js'
  import { getPaternalLineage } from '../lib/lineage.js'
  import { renderWikiInlineMarkdown } from '$lib/markdown/inline.js'
  import type { FamilyTreeData, FamilyTreePerson } from '../lib/types.js'
  import { NODE_WIDTH } from '../lib/types.js'
  import { computeInitialTreeView } from '../lib/viewport.js'
  import { Crosshair, User } from 'lucide-svelte'

  interface Props {
    data: FamilyTreeData
    existingPageSlugs?: string[]
    canEdit?: boolean
    selectedId?: string | null
    onselect?: (id: string) => void
    /** Fit and center the root on first render (reader embeds). */
    fitOnLoad?: boolean
  }

  let {
    data,
    existingPageSlugs = [],
    canEdit = false,
    selectedId = null,
    onselect,
    fitOnLoad = false
  }: Props = $props()

  const existingPages = $derived(
    new Set(Array.isArray(existingPageSlugs) ? existingPageSlugs : [])
  )

  let viewport = $state<HTMLDivElement | null>(null)
  let scale = $state(1)
  let panX = $state(0)
  let panY = $state(0)
  let dragging = $state(false)
  let backgroundPanActive = false
  let dragStartX = 0
  let dragStartY = 0
  let panStartX = 0
  let panStartY = 0
  const PAN_DRAG_THRESHOLD = 4
  let lineagePersonId = $state<string | null>(null)
  let initialFitDone = $state(false)

  const layout = $derived(layoutFamilyTree(data))
  const offsetX = $derived(layout.width / 2)
  const lineage = $derived(
    lineagePersonId ? getPaternalLineage(lineagePersonId, data) : null
  )

  function formatYears(person: FamilyTreePerson): string {
    const birth = person.birthYear?.trim()
    const death = person.deathYear?.trim()
    if (birth && death) return `${birth}–${death}`
    if (birth) return `b. ${birth}`
    if (death) return `d. ${death}`
    return ''
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top

    const step = 0.015
    const delta = event.deltaY > 0 ? -step : step
    const previousScale = scale
    const nextScale = Math.min(2, Math.max(0.35, previousScale + delta))
    if (nextScale === previousScale) return

    const scaleRatio = nextScale / previousScale
    panX = cursorX - (cursorX - panX) * scaleRatio
    panY = cursorY - (cursorY - panY) * scaleRatio
    scale = nextScale
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement
    if (
      target.closest('[data-person-node]') ||
      target.closest('a') ||
      target.closest('.ft-viewport__recenter')
    ) {
      return
    }
    backgroundPanActive = true
    dragging = false
    dragStartX = event.clientX
    dragStartY = event.clientY
    panStartX = panX
    panStartY = panY
    viewport?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!backgroundPanActive) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY

    if (!dragging && Math.hypot(deltaX, deltaY) >= PAN_DRAG_THRESHOLD) {
      dragging = true
    }

    if (!dragging) return

    panX = panStartX + deltaX
    panY = panStartY + deltaY
  }

  function onPointerUp(event: PointerEvent) {
    if (backgroundPanActive && !dragging) {
      lineagePersonId = null
    }

    backgroundPanActive = false
    dragging = false
    viewport?.releasePointerCapture(event.pointerId)
  }

  function activateNode(person: FamilyTreePerson) {
    if (person.parentIds.length > 0) {
      lineagePersonId = lineagePersonId === person.id ? null : person.id
    }

    onselect?.(person.id)
  }

  function onNodeClick(event: MouseEvent, person: FamilyTreePerson) {
    if ((event.target as HTMLElement).closest('a')) return
    activateNode(person)
  }

  function recenterView() {
    if (!viewport) return

    const offset = layout.width / 2
    const { width, height } = viewport.getBoundingClientRect()
    if (width <= 0 || height <= 0) return

    const view = computeInitialTreeView(layout, data.rootId, offset, width, height)
    scale = view.scale
    panX = view.panX
    panY = view.panY
  }

  function renderName(person: FamilyTreePerson): string {
    return renderWikiInlineMarkdown(person.name, { existingPages })
  }

  function personAltText(person: FamilyTreePerson): string {
    return person.name
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  }

  $effect(() => {
    data.rootId
    if (!fitOnLoad) return

    initialFitDone = false
  })

  $effect(() => {
    if (!fitOnLoad || initialFitDone || !viewport) return

    const offset = layout.width / 2
    const { width, height } = viewport.getBoundingClientRect()
    if (width <= 0 || height <= 0) return

    const view = computeInitialTreeView(layout, data.rootId, offset, width, height)
    scale = view.scale
    panX = view.panX
    panY = view.panY
    initialFitDone = true
  })
</script>

<div
  bind:this={viewport}
  class="ft-viewport"
  class:ft-viewport--dragging={dragging}
  role="application"
  aria-label="Family tree canvas. Drag to pan, scroll to zoom. Click a person to highlight paternal lineage."
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <button
    type="button"
    class="ft-viewport__recenter"
    aria-label="Recenter tree"
    title="Recenter tree"
    onclick={(event) => {
      event.stopPropagation()
      recenterView()
    }}
  >
    <Crosshair size={16} />
  </button>

  <div
    class="ft-canvas"
    style={`transform: translate(${panX}px, ${panY}px) scale(${scale}); width: ${layout.width}px; height: ${layout.height}px; transform-origin: 0 0;`}
  >
    <svg class="ft-edges" width={layout.width} height={layout.height} aria-hidden="true">
      {#each layout.edges as edge, index (index)}
        <line
          x1={edge.from.x + offsetX}
          y1={edge.from.y}
          x2={edge.to.x + offsetX}
          y2={edge.to.y}
          class="ft-edge ft-edge--{edge.kind}"
          class:ft-edge--lineage={edge.kind === 'parent-child' &&
            edge.childId != null &&
            lineage?.childEdgeIds.has(edge.childId)}
        />
      {/each}
    </svg>

    <div class="ft-nodes">
      {#each layout.nodes as node (node.person.id)}
        {@const years = formatYears(node.person)}
        <div
          data-person-node
          data-person-id={node.person.id}
          class="ft-node"
          class:ft-node--selected={selectedId === node.person.id}
          class:ft-node--editable={canEdit}
          class:ft-node--has-parents={node.person.parentIds.length > 0}
          class:ft-node--lineage={lineage?.personIds.has(node.person.id)}
          class:ft-node--lineage-focus={lineagePersonId === node.person.id}
          style={`left: ${node.x + offsetX}px; top: ${node.y}px; width: ${NODE_WIDTH}px;`}
          role="button"
          tabindex={canEdit || node.person.parentIds.length > 0 ? 0 : -1}
          onclick={(event) => onNodeClick(event, node.person)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activateNode(node.person)
            }
          }}
        >
          <div class="ft-node__photo">
            {#if node.person.imageUrl}
              <img src={node.person.imageUrl} alt={personAltText(node.person)} />
            {:else}
              <User size={28} class="text-base-content/25" />
            {/if}
          </div>
          <p class="ft-node__name">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html renderName(node.person)}
          </p>
          {#if years}
            <p class="ft-node__years">{years}</p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
