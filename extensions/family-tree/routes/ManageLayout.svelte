<script lang="ts">
  import BackToExtensions from '$lib/components/BackToExtensions.svelte'

  interface Props {
    children: import('svelte').Snippet
  }

  let { children }: Props = $props()
</script>

<div class="extension-manage">
  <div class="extension-manage__nav">
    <BackToExtensions />
  </div>
  <div class="extension-manage__body">
    {@render children()}
  </div>
</div>
