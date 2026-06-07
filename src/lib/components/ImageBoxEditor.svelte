<script lang="ts">
import { Upload, X, ImageIcon, GripVertical, Plus } from 'lucide-svelte'
import {
  createImageBoxItem,
  imageFilename,
  type ImageBoxData,
  type ImageBoxItem
} from '$lib/templates/imagebox-editor.js'

interface Props {
  data: ImageBoxData
  uploading?: boolean
  uploadingItemIndex?: number | null
  onupdate: (data: ImageBoxData) => void
  onremove?: () => void
  onupload: (files: FileList | null, itemIndex: number) => void
}

let {
  data,
  uploading = false,
  uploadingItemIndex = null,
  onupdate,
  onremove,
  onupload
}: Props = $props()

let draggedIndex = $state<number | null>(null)
let dropIndex = $state<number | null>(null)

function updateItem(index: number, item: ImageBoxItem) {
  const images = data.images.map((existing, itemIndex) => (itemIndex === index ? item : existing))
  onupdate({ ...data, images })
}

function addItem() {
  onupdate({ ...data, images: [...data.images, createImageBoxItem()] })
}

function removeItem(index: number) {
  if (data.images.length <= 1) return
  onupdate({
    ...data,
    images: data.images.filter((_, itemIndex) => itemIndex !== index)
  })
}

function moveItem(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
  if (fromIndex >= data.images.length || toIndex >= data.images.length) return

  const images = [...data.images]
  const [moved] = images.splice(fromIndex, 1)
  images.splice(toIndex, 0, moved)
  onupdate({ ...data, images })
}

function itemKey(item: ImageBoxItem, index: number): string {
  return item.id ?? `item-${index}`
}

function handleDragStart(index: number, event: DragEvent) {
  draggedIndex = index
  dropIndex = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  dropIndex = index
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleDrop(index: number, event: DragEvent) {
  event.preventDefault()
  if (draggedIndex === null) return
  moveItem(draggedIndex, index)
  draggedIndex = null
  dropIndex = null
}

function handleDragEnd() {
  draggedIndex = null
  dropIndex = null
}

function parseColumnsInput(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 4
  return Math.min(4, Math.max(1, parsed))
}

function resizeCaptionField(node: HTMLTextAreaElement) {
  const resize = () => {
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }

  resize()
  node.addEventListener('input', resize)
  return {
    update: resize,
    destroy() {
      node.removeEventListener('input', resize)
    }
  }
}

function handleCaptionKeydown(
  index: number,
  item: ImageBoxItem,
  event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }
) {
  if (event.key !== 'Enter') return

  event.preventDefault()
  const textarea = event.currentTarget
  const start = textarea.selectionStart ?? item.caption.length
  const end = textarea.selectionEnd ?? start
  const insert = event.shiftKey ? '\n\n' : '\n'
  const caption = item.caption.slice(0, start) + insert + item.caption.slice(end)

  updateItem(index, { ...item, caption })

  requestAnimationFrame(() => {
    textarea.selectionStart = start + insert.length
    textarea.selectionEnd = start + insert.length
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  })
}
</script>

<section class="wiki-imagebox-editor not-prose" aria-label="Image box editor">
  <div class="imagebox-editor-header">
    <span class="imagebox-editor-title">Image box</span>
    <label class="imagebox-editor-columns" for="imagebox-columns">
      <span>Per row</span>
      <input
        id="imagebox-columns"
        name="imagebox-columns"
        type="number"
        min="1"
        max="4"
        step="1"
        value={data.columns}
        aria-label="Images per row"
        class="imagebox-editor-input imagebox-editor-columns-input"
        oninput={(event) =>
          onupdate({ ...data, columns: parseColumnsInput(event.currentTarget.value) })}
      />
    </label>
  </div>

  <ul class="imagebox-editor-list">
    {#each data.images as item, index (itemKey(item, index))}
      <li
        class="imagebox-editor-item"
        class:imagebox-item-dragging={draggedIndex === index}
        class:imagebox-item-drop-target={dropIndex === index &&
          draggedIndex !== null &&
          draggedIndex !== index}
        draggable={data.images.length > 1}
        ondragstart={(event) => handleDragStart(index, event)}
        ondragover={(event) => handleDragOver(index, event)}
        ondrop={(event) => handleDrop(index, event)}
        ondragend={handleDragEnd}
      >
        {#if data.images.length > 1}
          <span class="imagebox-drag-handle" aria-hidden="true" title="Drag to reorder">
            <GripVertical size={14} />
          </span>
        {/if}

        <div class="imagebox-editor-thumb">
          <input
            id="imagebox-upload-{itemKey(item, index)}"
            name="imagebox-upload-{itemKey(item, index)}"
            type="file"
            class="hidden"
            accept="image/*"
            disabled={uploading && uploadingItemIndex === index}
            onchange={(event) => onupload(event.currentTarget.files, index)}
          />

          {#if item.image}
            <img src={item.image} alt={item.caption || imageFilename(item.image)} />
          {:else}
            <div class="imagebox-image-placeholder">
              <ImageIcon size={24} class="opacity-30" />
            </div>
          {/if}
        </div>

        <div class="imagebox-editor-fields">
          <div class="imagebox-editor-filename" title={item.image}>
            {item.image ? imageFilename(item.image) : 'No image selected'}
          </div>

          <input
            id="imagebox-url-{itemKey(item, index)}"
            name="imagebox-url-{itemKey(item, index)}"
            type="text"
            value={item.image}
            placeholder="Image URL"
            aria-label="Image URL for item {index + 1}"
            class="imagebox-editor-input"
            oninput={(event) => updateItem(index, { ...item, image: event.currentTarget.value })}
          />

          <textarea
            id="imagebox-caption-{itemKey(item, index)}"
            name="imagebox-caption-{itemKey(item, index)}"
            value={item.caption}
            placeholder="Caption (Enter for new line, Shift+Enter for gap)"
            aria-label="Caption for item {index + 1}"
            class="imagebox-editor-input imagebox-editor-caption"
            rows={2}
            use:resizeCaptionField
            oninput={(event) => updateItem(index, { ...item, caption: event.currentTarget.value })}
            onkeydown={(event) => handleCaptionKeydown(index, item, event)}
          ></textarea>

          <div class="imagebox-editor-actions">
            <label
              for="imagebox-upload-{itemKey(item, index)}"
              class="imagebox-upload-btn"
              aria-disabled={uploading && uploadingItemIndex === index}
            >
              {#if uploading && uploadingItemIndex === index}
                <span class="loading loading-spinner loading-xs"></span>
              {:else}
                <Upload size={14} />
              {/if}
              {item.image ? 'Change image' : 'Upload image'}
            </label>

            {#if data.images.length > 1}
              <button
                type="button"
                class="imagebox-remove-item"
                aria-label="Remove image"
                onclick={() => removeItem(index)}
              >
                <X size={12} />
                Remove
              </button>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>

  <div class="imagebox-editor-footer">
    <button type="button" class="imagebox-add-item" onclick={addItem}>
      <Plus size={14} />
      Add image
    </button>

    {#if onremove}
      <button type="button" class="imagebox-remove-box" onclick={onremove}>Remove image box</button>
    {/if}
  </div>
</section>
