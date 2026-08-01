<script lang="ts">
let {
  saving = false,
  noun = 'page',
  onReload,
  onOverwrite
}: {
  saving?: boolean
  noun?: string
  onReload: () => void
  onOverwrite: () => void
} = $props()
</script>

<div
  class="w-full flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2"
  role="alert"
>
  <p class="text-xs text-base-content/80 flex-1">
    This {noun} was modified elsewhere. Reload their version, or overwrite with your draft.
  </p>
  <div class="flex gap-2 shrink-0">
    <button type="button" class="btn btn-ghost btn-xs" disabled={saving} onclick={onReload}>
      Reload latest
    </button>
    <button type="button" class="btn btn-warning btn-xs" disabled={saving} onclick={onOverwrite}>
      Overwrite with mine
    </button>
  </div>
</div>
