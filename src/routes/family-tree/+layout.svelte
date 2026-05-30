<script lang="ts">
import ManageLayout from '$extensions/family-tree/routes/ManageLayout.svelte'

interface Props {
  children: import('svelte').Snippet
}

let { children }: Props = $props()
</script>

<ManageLayout {children} />
