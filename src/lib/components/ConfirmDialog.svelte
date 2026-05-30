<script lang="ts">
import type { Snippet } from 'svelte'

let {
  open,
  title,
  titleId,
  error = '',
  loading = false,
  confirmLabel = 'Confirm',
  loadingLabel = 'Working…',
  confirmClass = 'bg-error text-error-content hover:bg-error/90',
  dialogEl = $bindable<HTMLDivElement | null>(null),
  cancelBtn = $bindable<HTMLButtonElement | null>(null),
  onClose,
  onConfirm,
  children,
  actions
}: {
  open: boolean
  title: string
  titleId: string
  error?: string
  loading?: boolean
  confirmLabel?: string
  loadingLabel?: string
  confirmClass?: string
  dialogEl?: HTMLDivElement | null
  cancelBtn?: HTMLButtonElement | null
  onClose: () => void
  onConfirm?: () => void
  children?: Snippet
  actions?: Snippet
} = $props()

function handleModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onClose()
    return
  }
  if (e.key !== 'Tab' || !dialogEl) return
  const focusable = [...dialogEl.querySelectorAll<HTMLElement>('button:not([disabled])')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-base-content/20 backdrop-blur-sm"
      aria-label="Close dialog"
      onclick={onClose}
      tabindex="-1"
    ></button>
    <div
      bind:this={dialogEl}
      class="relative bg-base-100 rounded-2xl border border-base-200 shadow-xl w-full max-w-sm p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      onkeydown={handleModalKeydown}
    >
      <h3 id={titleId} class="font-bold text-base-content mb-1">{title}</h3>
      {#if children}
        <div class="text-sm text-base-content/60 mb-5">
          {@render children()}
        </div>
      {/if}
      {#if error}
        <p class="text-error text-sm mb-3" role="alert">{error}</p>
      {/if}
      <div class="flex gap-2 justify-end">
        <button
          bind:this={cancelBtn}
          type="button"
          onclick={onClose}
          class="h-9 px-4 rounded-lg text-sm font-medium text-base-content/70
                 hover:bg-base-200 border border-base-300 transition-all"
        >
          Cancel
        </button>
        {#if actions}
          {@render actions()}
        {:else if onConfirm}
          <button
            type="button"
            onclick={onConfirm}
            disabled={loading}
            class="h-9 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 {confirmClass}"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
