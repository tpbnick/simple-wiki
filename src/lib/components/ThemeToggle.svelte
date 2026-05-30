<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte.js'
  import { Sun, Moon } from 'lucide-svelte'
</script>

<button
  onclick={() => theme.toggle()}
  aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  class="w-8 h-8 flex items-center justify-center rounded-lg text-base-content/50
         hover:bg-base-200 hover:text-base-content transition-colors"
>
  {#if theme.isDark}
    <Sun size={16} />
  {:else}
    <Moon size={16} />
  {/if}
</button>
