<script lang="ts">
  import EditPage from '$extensions/family-tree/routes/EditPage.svelte'
  import type { EditPageData } from '$extensions/family-tree/routes/types.js'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<EditPage data={data as EditPageData} />
