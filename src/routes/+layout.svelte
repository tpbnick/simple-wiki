<script lang="ts">
  import '../app.css'
  import.meta.glob('../../extensions/*/styles/*.css', { eager: true })
  import Header from '$lib/components/Header.svelte'
  import Sidebar from '$lib/components/Sidebar.svelte'
  import { theme } from '$lib/stores/theme.svelte.js'
  import { tocStore } from '$lib/stores/toc.svelte.js'
  import { sidebarStore } from '$lib/stores/sidebar.svelte.js'
  import { shouldShowReaderSidebar, isReaderViewPath } from '$lib/reader-view.js'
  import { page } from '$app/state'
  import { browser } from '$app/environment'
  import AboutDialog from '$lib/components/AboutDialog.svelte'
  import { aboutDialogStore } from '$lib/stores/about-dialog.svelte.js'
  import type { LayoutData } from './$types'

  interface Props {
    data: LayoutData
    children: import('svelte').Snippet
  }

  let { data, children }: Props = $props()

  if (browser) theme.init()

  const isReaderView = $derived(isReaderViewPath(page.url.pathname))
  const showSidebar = $derived(shouldShowReaderSidebar(page.url.pathname, tocStore.entries.length))

  $effect(() => {
    sidebarStore.setEnabled(isReaderView)
    if (!isReaderView) {
      tocStore.clear()
    }
  })
</script>

<div class="min-h-screen flex flex-col bg-base-200">
  <a href="#main-content" class="skip-link">Skip to content</a>
  <Header user={data.user} />

  <div class="flex flex-1 min-h-0 max-w-screen-2xl mx-auto w-full">
    {#if showSidebar}
      <Sidebar />
    {/if}

    <main id="main-content" class="flex-1 min-w-0 bg-base-100">
      {@render children()}
    </main>
  </div>
</div>

<AboutDialog open={aboutDialogStore.isOpen} onClose={() => aboutDialogStore.close()} />
