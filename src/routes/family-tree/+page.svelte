<script lang="ts">
  import ListPage from '$extensions/family-tree/routes/ListPage.svelte'
  import type { ListPageData } from '$extensions/family-tree/routes/types.js'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<ListPage data={data as ListPageData} />
