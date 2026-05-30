<script lang="ts">
import RecentChangesList from '$lib/components/RecentChangesList.svelte'
import RecentChangesToolbar from '$lib/components/RecentChangesToolbar.svelte'
import type { ActionData, PageData } from './$types'

let { data, form }: { data: PageData; form: ActionData } = $props()
</script>

<svelte:head>
  <title>Recent Changes — Wiki</title>
</svelte:head>

<div class="px-6 py-8 lg:px-10 max-w-3xl">
  <RecentChangesToolbar
    changeCount={data.changes.length}
    revisionRetention={data.revisionRetention}
    isAdmin={data.isAdmin}
    {form}
    formAction="?/updateRevisionRetention"
  />

  <RecentChangesList changes={data.changes} timeStyle="short" />
</div>
