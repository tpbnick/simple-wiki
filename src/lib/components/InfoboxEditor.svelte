<script lang="ts">
  import { Upload, X, ImageIcon, Type, GripVertical } from 'lucide-svelte'
  import {
    createImageEntry,
    createTextEntry,
    infoboxImageSizeStyle,
    type InfoboxData,
    type InfoboxEntry
  } from '$lib/templates/infobox-editor.js'

  interface Props {
    data: InfoboxData
    uploading?: boolean
    uploadingEntryIndex?: number | null
    onupdate: (data: InfoboxData) => void
    onremove?: () => void
    onupload: (files: FileList | null, entryIndex: number) => void
  }

  let {
    data,
    uploading = false,
    uploadingEntryIndex = null,
    onupdate,
    onremove,
    onupload
  }: Props = $props()

  let imageInputs: Record<number, HTMLInputElement> = {}
  let draggedIndex = $state<number | null>(null)
  let dropIndex = $state<number | null>(null)

  function update(partial: Partial<InfoboxData>) {
    onupdate({ ...data, ...partial })
  }

  function updateEntry(index: number, entry: InfoboxEntry) {
    const entries = data.entries.map((existing, entryIndex) =>
      entryIndex === index ? entry : existing
    )
    onupdate({ ...data, entries })
  }

  function addEntry(kind: 'text' | 'image') {
    const entry = kind === 'text' ? createTextEntry() : createImageEntry()
    onupdate({ ...data, entries: [...data.entries, entry] })
  }

  function removeEntry(index: number) {
    if (data.entries.length <= 1) return
    onupdate({
      ...data,
      entries: data.entries.filter((_, entryIndex) => entryIndex !== index)
    })
  }

  function moveEntry(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= data.entries.length || toIndex >= data.entries.length) return

    const entries = [...data.entries]
    const [moved] = entries.splice(fromIndex, 1)
    entries.splice(toIndex, 0, moved)
    onupdate({ ...data, entries })
  }

  function openImageUpload(index: number) {
    imageInputs[index]?.click()
  }

  function entryKey(entry: InfoboxEntry, index: number): string {
    return entry.id ?? `row-${index}`
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
    moveEntry(draggedIndex, index)
    draggedIndex = null
    dropIndex = null
  }

  function handleDragEnd() {
    draggedIndex = null
    dropIndex = null
  }

  function parseSizeInput(value: string): number | undefined {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(parsed)) return undefined
    return Math.min(100, Math.max(1, parsed))
  }
</script>

<aside class="wiki-infobox wiki-infobox-editor not-prose">
  <table>
    <tbody>
      <tr>
        <th colspan="3" class="infobox-title">
          <input
            type="text"
            value={data.title}
            placeholder="Infobox title"
            aria-label="Infobox title"
            class="infobox-editor-input infobox-editor-title"
            oninput={(event) => update({ title: event.currentTarget.value })}
          />
        </th>
      </tr>

      {#each data.entries as entry, index (entryKey(entry, index))}
        {#if entry.type === 'text'}
          <tr
            class="infobox-editor-row"
            class:infobox-row-dragging={draggedIndex === index}
            class:infobox-row-drop-target={dropIndex === index && draggedIndex !== null && draggedIndex !== index}
            draggable={data.entries.length > 1}
            ondragstart={(event) => handleDragStart(index, event)}
            ondragover={(event) => handleDragOver(index, event)}
            ondrop={(event) => handleDrop(index, event)}
            ondragend={handleDragEnd}
          >
            <td class="infobox-drag-cell">
              {#if data.entries.length > 1}
                <span class="infobox-drag-handle" aria-hidden="true" title="Drag to reorder">
                  <GripVertical size={14} />
                </span>
              {/if}
            </td>
            <th scope="row">
              <div class="infobox-editor-label-cell">
                <input
                  type="text"
                  value={entry.label}
                  placeholder="Label"
                  aria-label="Label for row {index + 1}"
                  class="infobox-editor-input infobox-editor-label"
                  oninput={(event) =>
                    updateEntry(index, { ...entry, label: event.currentTarget.value })}
                />
                {#if data.entries.length > 1}
                  <button
                    type="button"
                    class="infobox-remove-row"
                    aria-label="Remove row"
                    onclick={() => removeEntry(index)}
                  >
                    <X size={12} />
                  </button>
                {/if}
              </div>
            </th>
            <td>
              <input
                type="text"
                value={entry.value}
                placeholder="Value"
                aria-label="Value for row {index + 1}"
                class="infobox-editor-input infobox-editor-value"
                oninput={(event) =>
                  updateEntry(index, { ...entry, value: event.currentTarget.value })}
              />
            </td>
          </tr>
        {:else}
          <tr
            class="infobox-editor-row"
            class:infobox-row-dragging={draggedIndex === index}
            class:infobox-row-drop-target={dropIndex === index && draggedIndex !== null && draggedIndex !== index}
            draggable={data.entries.length > 1}
            ondragstart={(event) => handleDragStart(index, event)}
            ondragover={(event) => handleDragOver(index, event)}
            ondrop={(event) => handleDrop(index, event)}
            ondragend={handleDragEnd}
          >
            <td class="infobox-drag-cell">
              {#if data.entries.length > 1}
                <span class="infobox-drag-handle" aria-hidden="true" title="Drag to reorder">
                  <GripVertical size={14} />
                </span>
              {/if}
            </td>
            <td colspan="2" class="infobox-image">
              <input
                bind:this={imageInputs[index]}
                type="file"
                class="hidden"
                accept="image/*"
                onchange={(event) => onupload(event.currentTarget.files, index)}
              />

              {#if entry.image}
                <img
                  src={entry.image}
                  alt={entry.caption || data.title}
                  style={infoboxImageSizeStyle(entry.size)}
                  data-size={entry.size != null && entry.size < 100 ? entry.size : undefined}
                />
              {:else}
                <div class="infobox-image-placeholder">
                  <ImageIcon size={28} class="opacity-30" />
                </div>
              {/if}

              <input
                type="text"
                value={entry.image}
                placeholder="Image URL"
                aria-label="Image URL"
                class="infobox-editor-input infobox-editor-image-url"
                oninput={(event) =>
                  updateEntry(index, { ...entry, image: event.currentTarget.value })}
              />

              <input
                type="text"
                value={entry.caption}
                placeholder="Image caption (optional)"
                aria-label="Image caption"
                class="infobox-editor-input infobox-editor-caption"
                oninput={(event) =>
                  updateEntry(index, { ...entry, caption: event.currentTarget.value })}
              />

              <label class="infobox-editor-size-field">
                <span class="infobox-editor-size-label">Size</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={entry.size ?? ''}
                  placeholder="100"
                  aria-label="Image size percentage"
                  class="infobox-editor-input infobox-editor-size"
                  oninput={(event) => {
                    const size = parseSizeInput(event.currentTarget.value)
                    updateEntry(index, {
                      ...entry,
                      size: event.currentTarget.value.trim() === '' ? undefined : size
                    })
                  }}
                />
                <span class="infobox-editor-size-suffix">%</span>
              </label>

              <div class="infobox-image-actions">
                <button
                  type="button"
                  class="infobox-add-image"
                  disabled={uploading && uploadingEntryIndex === index}
                  onclick={() => openImageUpload(index)}
                >
                  {#if uploading && uploadingEntryIndex === index}
                    <span class="loading loading-spinner loading-xs"></span>
                  {:else}
                    <Upload size={14} />
                  {/if}
                  {entry.image ? 'Change image' : 'Upload image'}
                </button>

                {#if data.entries.length > 1}
                  <button
                    type="button"
                    class="infobox-remove-image-row"
                    onclick={() => removeEntry(index)}
                  >
                    Remove image
                  </button>
                {/if}
              </div>
            </td>
          </tr>
        {/if}
      {/each}

      <tr>
        <td colspan="3" class="infobox-add-row-cell">
          <div class="infobox-add-row-actions">
            <button
              type="button"
              class="infobox-add-row-option"
              onclick={() => addEntry('text')}
            >
              <Type size={14} />
              Text row
            </button>
            <button
              type="button"
              class="infobox-add-row-option"
              onclick={() => addEntry('image')}
            >
              <ImageIcon size={14} />
              Image row
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  {#if onremove}
    <button type="button" class="infobox-remove" onclick={onremove}>Remove infobox</button>
  {/if}
</aside>
