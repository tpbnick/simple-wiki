<script lang="ts">
import type { RevisionDiffLine } from '$lib/db/revisions.js'

let { lines }: { lines: RevisionDiffLine[] } = $props()
</script>

{#if lines.length > 0}
  <div class="wiki-diff" role="region" aria-label="Line changes in this edit">
    {#each lines as line, index (index)}
      <div class="wiki-diff-line wiki-diff-{line.type}">
        <span class="wiki-diff-marker" aria-hidden="true">
          {line.type === 'add' ? '+' : '−'}
        </span>
        <span class="wiki-diff-text">{line.text || ' '}</span>
      </div>
    {/each}
  </div>
{:else}
  <p class="text-xs text-base-content/50 italic">No changes detected — empty save.</p>
{/if}
