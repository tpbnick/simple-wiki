<script lang="ts">
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'

let {
  target,
  error = '',
  loading = false,
  dialogEl = $bindable<HTMLDivElement | null>(null),
  cancelBtn = $bindable<HTMLButtonElement | null>(null),
  onClose,
  onConfirm
}: {
  target: { type: 'page' | 'file'; label: string } | null
  error?: string
  loading?: boolean
  dialogEl?: HTMLDivElement | null
  cancelBtn?: HTMLButtonElement | null
  onClose: () => void
  onConfirm: () => void
} = $props()
</script>

<ConfirmDialog
  open={target !== null}
  title="Confirm deletion"
  titleId="delete-dialog-title"
  {error}
  {loading}
  confirmLabel="Delete"
  loadingLabel="Deleting…"
  bind:dialogEl
  bind:cancelBtn
  {onClose}
  {onConfirm}
>
  {#if target?.type === 'page'}
    Delete <strong class="text-base-content">"{target.label}"</strong>? This cannot be undone.
  {:else if target}
    Delete <strong class="text-base-content">"{target.label}"</strong>? Deletion is blocked when
    pages still link to this file.
  {/if}
</ConfirmDialog>
