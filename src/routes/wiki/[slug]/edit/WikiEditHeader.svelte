<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte'

  let {
    title = $bindable(),
    namespace = $bindable(),
    showPreview,
    onTogglePreview
  }: {
    title: string
    namespace: string
    showPreview: boolean
    onTogglePreview: () => void
  } = $props()
</script>

<div class="flex items-center gap-3 px-4 py-2 border-b border-base-300 bg-base-100 shrink-0">
  <div class="flex-1 flex items-center gap-3 min-w-0">
    <label class="sr-only" for="page-title">Page title</label>
    <input
      id="page-title"
      type="text"
      bind:value={title}
      placeholder="Page title"
      class="input-sm text-lg font-semibold flex-1 min-w-0 bg-transparent border-0 border-b-2
             border-base-300 focus:border-primary focus:outline-none px-0 pb-0.5 transition-colors"
    />
    <label class="sr-only" for="page-namespace">Namespace</label>
    <select id="page-namespace" bind:value={namespace} class="select select-bordered select-xs">
      <option value="article">Article</option>
      <option value="template">Template</option>
      <option value="help">Help</option>
    </select>
  </div>
  <button type="button" onclick={onTogglePreview} class="btn btn-ghost btn-xs gap-1">
    {#if showPreview}
      <EyeOff size={13} /> Hide preview
    {:else}
      <Eye size={13} /> Preview
    {/if}
  </button>
</div>
