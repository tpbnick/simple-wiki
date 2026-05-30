<script lang="ts">
  import RecentChangesList from '$lib/components/RecentChangesList.svelte'
  import RecentChangesToolbar from '$lib/components/RecentChangesToolbar.svelte'
  import type { ActionData } from './$types'
  import type { RecentChange } from '$lib/db/types.js'

  let {
    recent,
    revisionRetention,
    form
  }: {
    recent: RecentChange[]
    revisionRetention: number | null
    form: ActionData
  } = $props()
</script>

<RecentChangesToolbar
  changeCount={recent.length}
  {revisionRetention}
  isAdmin
  form={form}
  formAction="?/updateRevisionRetention"
  settingsTab="recent"
  compact
/>

<RecentChangesList changes={recent} timeStyle="short" />
