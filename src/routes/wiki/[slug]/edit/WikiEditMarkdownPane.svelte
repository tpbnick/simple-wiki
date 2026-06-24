<script lang="ts">
let {
  content = $bindable(),
  placeholder,
  showPreview,
  dragOver = $bindable(),
  textarea = $bindable(),
  onInput,
  onKeydown,
  onFileDrop
}: {
  content: string
  placeholder: string
  showPreview: boolean
  dragOver: boolean
  textarea: HTMLTextAreaElement | undefined
  onInput: () => void
  onKeydown: (event: KeyboardEvent) => void
  onFileDrop: (files: FileList | null) => void
} = $props()
</script>

<div
  class="flex flex-col border-base-300 min-h-0 flex-1 md:flex-none md:w-1/2 md:border-r"
  class:w-full={!showPreview}
>
  <div
    class="px-2 py-1 text-xs font-medium text-base-content/50 bg-base-200 border-b border-base-300"
  >
    Markdown
  </div>
  <label class="sr-only" for="wiki-edit-content">Page content</label>
  <textarea
    id="wiki-edit-content"
    name="content"
    bind:this={textarea}
    bind:value={content}
    oninput={onInput}
    onkeydown={onKeydown}
    spellcheck="true"
    {placeholder}
    class="editor-pane flex-1 w-full resize-none p-4 bg-base-100 text-base-content focus:outline-none
           transition-[box-shadow] {dragOver ? 'ring-2 ring-inset ring-primary/50' : ''}"
    ondragover={(e) => {
      e.preventDefault()
      dragOver = true
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={(e) => {
      e.preventDefault()
      dragOver = false
      onFileDrop(e.dataTransfer?.files ?? null)
    }}></textarea>
</div>
