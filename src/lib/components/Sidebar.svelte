<script lang="ts">
import { afterNavigate } from '$app/navigation'
import { onMount } from 'svelte'
import { tocStore } from '$lib/stores/toc.svelte.js'
import { sidebarStore } from '$lib/stores/sidebar.svelte.js'
import type { SidebarItem } from '$lib/extensions/types.js'

interface Props {
  extensionNavItems?: SidebarItem[]
}

let { extensionNavItems = [] }: Props = $props()

let activeId = $state<string | null>(null)
let observer: IntersectionObserver | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

function setupObserver(entries: typeof tocStore.entries, attempt = 0) {
  observer?.disconnect()
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (entries.length === 0) {
    activeId = null
    return
  }

  const ids = entries.map((entry) => entry.id)
  const headings = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]

  if (headings.length === 0) {
    activeId = null
    if (attempt < 5) {
      retryTimer = setTimeout(() => setupObserver(entries, attempt + 1), 100)
    }
    return
  }

  const above = new Set<string>()

  observer = new IntersectionObserver(
    (records) => {
      for (const rec of records) {
        if (rec.isIntersecting) {
          above.delete(rec.target.id)
        } else if (rec.boundingClientRect.top < 0) {
          above.add(rec.target.id)
        }
      }
      const aboveList = ids.filter((id) => above.has(id))
      activeId = aboveList.length > 0 ? aboveList[aboveList.length - 1] : ids[0]
    },
    { rootMargin: '-58px 0px 0px 0px', threshold: 0 }
  )

  for (const heading of headings) observer.observe(heading)
}

$effect(() => {
  const entries = tocStore.entries
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => setupObserver(entries))
  }
  return () => {
    observer?.disconnect()
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }
})

function getActiveParentId(entries: typeof tocStore.entries, active: string | null) {
  if (!active) return null
  const idx = entries.findIndex((entry) => entry.id === active)
  if (idx < 0) return null
  if (entries[idx].level <= 2) return null
  for (let i = idx - 1; i >= 0; i--) {
    if (entries[i].level <= 2) return entries[i].id
  }
  return null
}

function closeMobileToc() {
  sidebarStore.close()
}

function scrollToHeading(id: string, mobile: boolean, event: MouseEvent) {
  event.preventDefault()
  scrollToId(id)
  if (mobile) {
    requestAnimationFrame(() => closeMobileToc())
  }
}

function scrollToId(id: string) {
  const scroll = () => {
    const heading = document.getElementById(id)
    if (!heading) return false
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    activeId = id
    return true
  }
  if (scroll()) return
  requestAnimationFrame(() => {
    scroll()
  })
}

function scrollToLocationHash() {
  const id = window.location.hash.slice(1)
  if (id) scrollToId(id)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && sidebarStore.isOpen) {
    closeMobileToc()
  }
}

onMount(() => {
  scrollToLocationHash()
})

afterNavigate(() => {
  scrollToLocationHash()
})

const hasToc = $derived(tocStore.entries.length > 0)
const hasExtensionNav = $derived(extensionNavItems.length > 0)
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet tocNav(mobile: boolean)}
  <nav aria-label="Table of contents">
    <ul class="space-y-0">
      {#each tocStore.entries as entry}
        {@const isActive = activeId === entry.id}
        {@const parentId = getActiveParentId(tocStore.entries, activeId)}
        {@const isActiveParent = entry.id === parentId}
        {@const showBullet = entry.level <= 2 || isActive || isActiveParent}
        <li>
          <a
            href="#{entry.id}"
            onclick={(event) => scrollToHeading(entry.id, mobile, event)}
            class="w-full text-left leading-snug transition-colors duration-150 block
                   {entry.level === 1
              ? 'py-2 px-1 text-[1.05rem] font-semibold'
              : entry.level === 2
                ? 'py-1.5 px-1 text-[0.95rem] font-medium flex items-start gap-1.5'
                : entry.level === 3
                  ? 'py-1 pl-4 pr-1 text-[0.875rem] flex items-start gap-1.5'
                  : 'py-0.5 pl-7 pr-1 text-[0.825rem] flex items-start gap-1'}
                   {isActive
              ? 'text-primary'
              : isActiveParent
                ? 'text-base-content/80'
                : 'text-base-content/60 hover:text-base-content/90'}"
          >
            {#if entry.level >= 2}
              <span
                class="shrink-0 mt-[0.2em] transition-opacity
                       {showBullet ? 'opacity-100' : 'opacity-0'}
                       {isActive ? 'text-primary' : 'text-base-content/50'}
                       {entry.level === 2 ? 'text-[0.9em]' : 'text-[0.75em]'}"
              >
                •
              </span>
            {/if}
            <span>{entry.text}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/snippet}

{#snippet sidebarContent(mobile: boolean)}
  {#if hasExtensionNav}
    <div class={hasToc ? 'mb-6 pb-6 border-b border-base-200' : ''}>
      <p
        class="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-base-content/40 mb-4 px-1"
      >
        Links
      </p>
      <nav aria-label="Extension links">
        <ul class="space-y-1">
          {#each extensionNavItems as item (item.href)}
            <li>
              <a
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                class="block py-1.5 px-1 text-sm text-base-content/70 hover:text-primary transition-colors"
                onclick={mobile ? () => closeMobileToc() : undefined}
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  {/if}
  {#if hasToc}
    <div>
      <p
        class="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-base-content/40 mb-4 px-1"
      >
        Contents
      </p>
      {@render tocNav(mobile)}
    </div>
  {/if}
{/snippet}

<!-- Desktop sidebar -->
<aside
  class="wiki-sidebar shrink-0 hidden lg:block"
  class:wiki-sidebar--collapsed={!sidebarStore.isOpen}
>
  <div
    class="sticky top-14 overflow-y-auto py-6 px-4"
    style="height: calc(100vh - 3.5rem); width: 15rem;"
  >
    {@render sidebarContent(false)}
  </div>
</aside>

<!-- Mobile sidebar drawer -->
<div
  class="lg:hidden fixed inset-0 z-40"
  class:invisible={!sidebarStore.isOpen}
  class:pointer-events-none={!sidebarStore.isOpen}
  aria-hidden={!sidebarStore.isOpen}
>
  <button
    type="button"
    class="wiki-sidebar-backdrop absolute inset-0 bg-base-content/20 backdrop-blur-sm"
    class:wiki-sidebar-backdrop--closed={!sidebarStore.isOpen}
    aria-label="Close sidebar"
    tabindex={sidebarStore.isOpen ? 0 : -1}
    onclick={closeMobileToc}
  ></button>
  <div
    class="wiki-sidebar-drawer absolute left-0 top-14 bottom-0 w-72 max-w-[85vw] bg-base-100 border-r border-base-300 shadow-xl overflow-y-auto py-6 px-4"
    class:wiki-sidebar-drawer--closed={!sidebarStore.isOpen}
    role="dialog"
    aria-modal="true"
    aria-label="Navigation"
    aria-hidden={!sidebarStore.isOpen}
    tabindex={sidebarStore.isOpen ? 0 : -1}
  >
    {@render sidebarContent(true)}
  </div>
</div>
