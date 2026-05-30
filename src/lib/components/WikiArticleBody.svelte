<script lang="ts">
  import { tick } from 'svelte'
  import { mountWikiLightbox, closeActiveWikiLightbox } from '$lib/actions/wikiLightbox.js'
  import { runExtensionArticleMounts } from '$lib/extensions/client-mount.js'

  interface Props {
    html: string
  }

  let { html }: Props = $props()
  let container = $state<HTMLDivElement | null>(null)
  let detachLightbox: (() => void) | undefined
  let detachHighlights: (() => void) | undefined
  let detachFamilyTrees: (() => void) | undefined

  function attachFootnoteHighlights(root: HTMLElement): () => void {
    const links = root.querySelectorAll<HTMLAnchorElement>(
      'a[href^="#fn-"], a[href^="#fnref-"]'
    )
    const handlers: Array<{ el: HTMLAnchorElement; fn: () => void }> = []

    for (const link of links) {
      const fn = () => {
        const targetId = link.getAttribute('href')?.slice(1)
        if (!targetId) return
        const target = root.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`)
        if (!target) return
        target.classList.remove('wiki-fn-highlight')
        void target.offsetWidth // force reflow to restart animation
        target.classList.add('wiki-fn-highlight')
      }
      link.addEventListener('click', fn)
      handlers.push({ el: link, fn })
    }

    return () => {
      for (const { el, fn } of handlers) el.removeEventListener('click', fn)
    }
  }

  $effect(() => {
    html
    const root = container
    if (!root) return

    let cancelled = false

    void tick().then(() => {
      if (cancelled || !container) return

      detachLightbox?.()
      detachHighlights?.()
      detachFamilyTrees?.()

      detachLightbox = mountWikiLightbox(container)
      detachHighlights = attachFootnoteHighlights(container)
      detachFamilyTrees = runExtensionArticleMounts(container)
    })

    return () => {
      cancelled = true
      detachLightbox?.()
      detachHighlights?.()
      detachFamilyTrees?.()
      closeActiveWikiLightbox()
      detachLightbox = undefined
      detachHighlights = undefined
      detachFamilyTrees = undefined
    }
  })
</script>

<div
  bind:this={container}
  class="wiki-content wiki-article-body
         prose prose-base max-w-none
         prose-headings:font-bold prose-headings:tracking-tight
         prose-headings:text-base-content
         prose-a:no-underline prose-a:text-primary
         prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
         prose-code:text-base-content prose-code:text-sm"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>
