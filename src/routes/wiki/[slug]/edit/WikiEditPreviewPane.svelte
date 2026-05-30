<script lang="ts">
import InfoboxEditor from '$lib/components/InfoboxEditor.svelte'
import ImageBoxEditor from '$lib/components/ImageBoxEditor.svelte'
import WikiArticleBody from '$lib/components/WikiArticleBody.svelte'
import type { InfoboxData } from '$lib/templates/infobox-editor.js'
import type { ImageBoxData } from '$lib/templates/imagebox-editor.js'

let {
  previewLoading,
  previewError,
  previewHtml,
  infoboxEditorActive,
  infoboxData,
  infoboxUploading,
  infoboxUploadingEntryIndex,
  imageBoxMatches,
  imageBoxDataById,
  imageBoxUploading,
  imageBoxUploadingBoxId,
  imageBoxUploadingItemIndex,
  onUpdateInfobox,
  onRemoveInfobox,
  onInfoboxUpload,
  onUpdateImageBox,
  onRemoveImageBox,
  onImageBoxUpload
}: {
  previewLoading: boolean
  previewError: string
  previewHtml: string
  infoboxEditorActive: boolean
  infoboxData: InfoboxData | null
  infoboxUploading: boolean
  infoboxUploadingEntryIndex: number | null
  imageBoxMatches: Array<{ data: ImageBoxData }>
  imageBoxDataById: Record<string, ImageBoxData>
  imageBoxUploading: boolean
  imageBoxUploadingBoxId: string | null
  imageBoxUploadingItemIndex: number | null
  onUpdateInfobox: (data: InfoboxData) => void
  onRemoveInfobox: () => void
  onInfoboxUpload: (files: FileList | null, entryIndex: number) => void
  onUpdateImageBox: (id: string, data: ImageBoxData) => void
  onRemoveImageBox: (id: string) => void
  onImageBoxUpload: (boxId: string, itemIndex: number, files: FileList | null) => void
} = $props()
</script>

<div class="flex flex-col flex-1 min-w-0 min-h-[40vh] md:min-h-0 overflow-hidden md:w-1/2">
  <div
    class="px-2 py-1 text-xs font-medium text-base-content/50 bg-base-200 border-b border-base-300 flex items-center gap-2"
  >
    Preview
    {#if previewLoading}
      <span class="loading loading-dots loading-xs"></span>
    {/if}
  </div>
  <div
    class="wiki-content prose prose-base max-w-none p-6 overflow-y-auto flex-1
           prose-headings:text-base-content prose-a:no-underline
           prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0"
  >
    {#if infoboxEditorActive && infoboxData}
      <InfoboxEditor
        data={infoboxData}
        uploading={infoboxUploading}
        uploadingEntryIndex={infoboxUploadingEntryIndex}
        onupdate={onUpdateInfobox}
        onremove={onRemoveInfobox}
        onupload={onInfoboxUpload}
      />
    {/if}
    {#each imageBoxMatches as match (match.data.id)}
      {@const boxData = imageBoxDataById[match.data.id] ?? match.data}
      <ImageBoxEditor
        data={boxData}
        uploading={imageBoxUploading && imageBoxUploadingBoxId === match.data.id}
        uploadingItemIndex={imageBoxUploadingBoxId === match.data.id
          ? imageBoxUploadingItemIndex
          : null}
        onupdate={(data) => onUpdateImageBox(match.data.id, data)}
        onremove={() => onRemoveImageBox(match.data.id)}
        onupload={(files, index) => onImageBoxUpload(match.data.id, index, files)}
      />
    {/each}
    {#if previewError}
      <p class="text-error text-sm">{previewError}</p>
    {:else if previewHtml}
      <WikiArticleBody html={previewHtml} />
    {:else}
      <p class="text-base-content/30 italic text-sm">Preview will appear here…</p>
    {/if}
  </div>
</div>
