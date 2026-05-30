<script lang="ts">
  interface Props {
    title?: string
    message: string
  }

  let { title = 'Family tree could not be displayed', message }: Props = $props()
</script>

<div class="wiki-family-tree-error" role="alert">
  <p class="wiki-family-tree-error__title">{title}</p>
  <p class="wiki-family-tree-error__message">{message}</p>
</div>
