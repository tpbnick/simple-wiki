<script lang="ts">
  import { Settings, HelpCircle } from 'lucide-svelte'
  import { settingsStore } from '$lib/stores/settings.svelte.js'
  import { FONTS, SIZES } from '$lib/reading-options.js'
  import { READING_WIDTH_OPTIONS, readingWidthIndex } from '$lib/reading-width.js'
  import { onMount } from 'svelte'

  let open = $state(false)
  let panel = $state<HTMLDivElement | null>(null)

  onMount(() => settingsStore.init())

  function handleOutsideClick(e: MouseEvent) {
    if (open && panel && !panel.contains(e.target as Node)) {
      open = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }
</script>

<svelte:window onclick={handleOutsideClick} onkeydown={handleKeydown} />

<div class="relative">
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation()
      open = !open
    }}
    aria-label="Reading settings"
    aria-expanded={open}
    aria-controls="reading-settings-panel"
    class="w-8 h-8 flex items-center justify-center rounded-lg text-base-content/50
           hover:bg-base-200 hover:text-base-content transition-colors"
  >
    <Settings size={15} />
  </button>

  {#if open}
    <div
      id="reading-settings-panel"
      bind:this={panel}
      role="region"
      aria-label="Reading settings"
      class="absolute right-0 top-10 z-50 w-64 bg-base-100 border border-base-300
             rounded-xl shadow-xl p-4 space-y-5"
    >
      <div>
        <p class="text-[0.65rem] font-bold uppercase tracking-widest text-base-content/40 mb-2">Font</p>
        <div class="space-y-1">
          {#each FONTS as font}
            <button
              type="button"
              aria-pressed={settingsStore.fontId === font.id}
              onclick={() => settingsStore.setFont(font.id)}
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm
                     transition-colors text-left
                     {settingsStore.fontId === font.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-base-200 text-base-content/70'}"
              style="font-family: {font.stack}"
            >
              {font.label}
              {#if settingsStore.fontId === font.id}
                <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <p class="text-[0.65rem] font-bold uppercase tracking-widest text-base-content/40 mb-2">Text size</p>
        <div class="flex gap-1">
          {#each SIZES as size}
            <button
              type="button"
              aria-pressed={settingsStore.sizeId === size.id}
              onclick={() => settingsStore.setSize(size.id)}
              class="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                     {settingsStore.sizeId === size.id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-base-200 text-base-content/60'}"
            >
              {size.label}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <p class="text-[0.65rem] font-bold uppercase tracking-widest text-base-content/40 mb-2">Width</p>
        <input
          id="reading-width"
          type="range"
          min={0}
          max={READING_WIDTH_OPTIONS.length - 1}
          step={1}
          value={readingWidthIndex(settingsStore.readingWidth)}
          aria-valuemin={0}
          aria-valuemax={READING_WIDTH_OPTIONS.length - 1}
          aria-valuenow={readingWidthIndex(settingsStore.readingWidth)}
          aria-valuetext="Reading width"
          oninput={(e) => settingsStore.setReadingWidthIndex(Number(e.currentTarget.value))}
          class="range range-primary range-xs w-full"
        />
      </div>

      <div class="border-t border-base-300 pt-3">
        <a
          href="/wiki/help"
          onclick={() => (open = false)}
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-base-content/60
                 hover:bg-base-200 hover:text-base-content transition-colors"
        >
          <HelpCircle size={14} />
          Help
        </a>
      </div>
    </div>
  {/if}
</div>
