<script lang="ts">
import { goto } from '$app/navigation'
import { base } from '$app/paths'
import { page } from '$app/state'
import { onMount } from 'svelte'
import ThemeToggle from './ThemeToggle.svelte'
import SettingsPanel from './SettingsPanel.svelte'
import { sidebarStore } from '$lib/stores/sidebar.svelte.js'
import { tocStore } from '$lib/stores/toc.svelte.js'
import { shouldShowReaderSidebar } from '$lib/reader-view.js'
import { MIN_SEARCH_SUGGESTION_LENGTH } from '$lib/search-constants.js'
import { Search, LayoutDashboard, LogOut, LogIn, FilePlus } from 'lucide-svelte'

interface Props {
  user?: App.Locals['user']
}

interface Suggestion {
  slug: string
  title: string
}

let { user }: Props = $props()
let query = $state('')
let searchFocused = $state(false)
let suggestions = $state<Suggestion[]>([])
let suggestLoading = $state(false)
let suggestError = $state<string | null>(null)
let activeIndex = $state(-1)
let searchInput = $state<HTMLInputElement | null>(null)
let suggestAbort: AbortController | null = null
let suggestTimer: ReturnType<typeof setTimeout> | undefined

const showSuggestions = $derived(
  searchFocused && query.trim().length >= MIN_SEARCH_SUGGESTION_LENGTH
)

const extensionNavCount = $derived(
  Array.isArray(page.data.sidebarItems) ? page.data.sidebarItems.length : 0
)

const showSidebarToggle = $derived(
  shouldShowReaderSidebar(page.url.pathname, tocStore.entries.length, extensionNavCount)
)

onMount(() => {
  sidebarStore.init()
  return () => {
    clearTimeout(suggestTimer)
    suggestAbort?.abort()
  }
})

$effect(() => {
  if (page.url.pathname === '/search') {
    const urlQuery = page.url.searchParams.get('q')
    if (urlQuery !== null) query = urlQuery
  }
})

function scheduleSuggestions() {
  clearTimeout(suggestTimer)
  suggestTimer = setTimeout(() => {
    void fetchSuggestions()
  }, 200)
}

async function fetchSuggestions() {
  const q = query.trim()
  if (q.length < MIN_SEARCH_SUGGESTION_LENGTH) {
    suggestions = []
    activeIndex = -1
    suggestLoading = false
    suggestError = null
    return
  }

  suggestAbort?.abort()
  suggestAbort = new AbortController()
  suggestLoading = true
  suggestError = null

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8&suggestions=1`, {
      signal: suggestAbort.signal
    })
    if (!res.ok) {
      suggestions = []
      suggestError = 'Search is temporarily unavailable'
      return
    }
    suggestions = await res.json()
    activeIndex = -1
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    suggestions = []
    suggestError = 'Search is temporarily unavailable'
  } finally {
    suggestLoading = false
  }
}

function handleQueryInput() {
  scheduleSuggestions()
}

function dismissSearch() {
  searchFocused = false
  suggestions = []
  activeIndex = -1
}

function handleSearch(e: SubmitEvent) {
  e.preventDefault()
  if (activeIndex >= 0 && suggestions[activeIndex]) {
    selectSuggestion(suggestions[activeIndex])
    return
  }
  if (query.trim()) goto(`/search?q=${encodeURIComponent(query.trim())}`)
}

function selectSuggestion(suggestion: Suggestion) {
  dismissSearch()
  query = suggestion.title
  searchInput?.blur()
  void goto(`/wiki/${suggestion.slug}`)
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (!showSuggestions && e.key !== 'Escape') return

  if (e.key === 'ArrowDown') {
    if (!suggestions.length) return
    e.preventDefault()
    activeIndex = Math.min(activeIndex + 1, suggestions.length - 1)
  } else if (e.key === 'ArrowUp') {
    if (!suggestions.length) return
    e.preventDefault()
    activeIndex = Math.max(activeIndex - 1, -1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    dismissSearch()
    searchInput?.blur()
  } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
    e.preventDefault()
    selectSuggestion(suggestions[activeIndex])
  }
}

function handleSearchBlur() {
  setTimeout(() => {
    searchFocused = false
    activeIndex = -1
  }, 150)
}
</script>

<header class="wiki-header sticky top-0 z-50 h-14">
  <div class="flex items-center gap-2 px-4 h-full w-full">
    {#if showSidebarToggle}
      <button
        type="button"
        onclick={() => sidebarStore.toggle()}
        aria-label={sidebarStore.isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={sidebarStore.isOpen}
        class="w-8 h-8 flex flex-col items-center justify-center gap-[5px] rounded-lg
               transition-all shrink-0
               text-base-content/50 hover:bg-base-200 hover:text-base-content"
      >
        <span class="block w-[18px] h-[1.5px] bg-current rounded-full transition-all duration-300"
        ></span>
        <span class="block w-[18px] h-[1.5px] bg-current rounded-full transition-all duration-300"
        ></span>
        <span class="block w-[18px] h-[1.5px] bg-current rounded-full transition-all duration-300"
        ></span>
      </button>
    {/if}

    <a href="/" class="flex items-center shrink-0 group" aria-label="Wiki home">
      <img
        src="{base}/favicon/favicon.svg"
        alt=""
        width="32"
        height="32"
        class="rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
      />
    </a>

    <form onsubmit={handleSearch} class="flex-1 max-w-lg" role="search">
      <label class="sr-only" for="wiki-search">Search pages</label>
      <div class="relative">
        <Search
          size={14}
          class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors z-10
                 {searchFocused ? 'text-primary' : 'text-base-content/40'}"
        />
        <input
          bind:this={searchInput}
          id="wiki-search"
          type="search"
          placeholder="Search pages…"
          bind:value={query}
          oninput={handleQueryInput}
          onfocus={() => (searchFocused = true)}
          onblur={handleSearchBlur}
          onkeydown={handleSearchKeydown}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="wiki-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `wiki-search-option-${activeIndex}` : undefined}
          autocomplete="off"
          class="w-full h-9 pl-9 pr-4 rounded-lg border bg-base-200 text-sm
                 border-base-300 hover:border-base-content/20 focus:border-primary
                 focus:outline-none focus:ring-2 focus:ring-primary/20
                 placeholder:text-base-content/40 transition-all"
        />

        {#if showSuggestions}
          <ul
            id="wiki-search-suggestions"
            role="listbox"
            aria-label="Search suggestions"
            class="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg border border-base-300
                   bg-base-100 shadow-lg z-50 max-h-72 overflow-y-auto"
          >
            {#if suggestLoading}
              <li class="px-3 py-2 text-sm text-base-content/50" role="presentation">Searching…</li>
            {:else if suggestError}
              <li class="px-3 py-2 text-sm text-error" role="presentation">{suggestError}</li>
            {:else if suggestions.length === 0}
              <li class="px-3 py-2 text-sm text-base-content/50" role="presentation">
                No matching pages
              </li>
            {:else}
              {#each suggestions as suggestion, index (suggestion.slug)}
                <li
                  id="wiki-search-option-{index}"
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <button
                    type="button"
                    tabindex="-1"
                    class="w-full px-3 py-2 text-left text-sm transition-colors
                           {activeIndex === index
                      ? 'bg-primary/10 text-primary'
                      : 'text-base-content hover:bg-base-200'}"
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => selectSuggestion(suggestion)}
                  >
                    <span class="font-medium">{suggestion.title}</span>
                    <span class="ml-2 text-xs text-base-content/40">{suggestion.slug}</span>
                  </button>
                </li>
              {/each}
            {/if}
            <li role="presentation" class="border-t border-base-300 mt-1 pt-1">
              <button
                type="button"
                tabindex="-1"
                class="w-full px-3 py-2 text-left text-sm text-primary hover:bg-base-200 transition-colors"
                onmousedown={(e) => e.preventDefault()}
                onclick={() => {
                  dismissSearch()
                  if (query.trim()) goto(`/search?q=${encodeURIComponent(query.trim())}`)
                }}
              >
                View all results for “{query.trim()}”
              </button>
            </li>
          </ul>
        {/if}
      </div>
    </form>

    <div class="flex items-center gap-1 ml-auto">
      {#if user}
        <a
          href="/wiki/new/edit"
          class="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg
                 bg-primary text-primary-content hover:bg-primary/90 transition-colors shadow-sm"
          aria-label="New page"
          title="New page"
        >
          <FilePlus size={15} />
        </a>
        <a
          href="/wiki/new/edit"
          class="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
                 bg-primary text-primary-content hover:bg-primary/90 transition-colors shadow-sm"
        >
          <FilePlus size={14} />
          New page
        </a>
        {#if user.isAdmin}
          <a
            href="/admin"
            class="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg
                 text-base-content/70 hover:bg-base-200 hover:text-base-content transition-colors"
            aria-label="Admin dashboard"
            title="Admin dashboard"
          >
            <LayoutDashboard size={15} />
          </a>
          <a
            href="/admin"
            class="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
                 text-base-content/70 hover:bg-base-200 hover:text-base-content transition-colors"
            title="Admin dashboard"
          >
            <LayoutDashboard size={14} />
            Admin
          </a>
        {/if}
        <form method="POST" action="/logout">
          <button
            type="submit"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-base-content/50
                   hover:bg-base-200 hover:text-base-content transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </form>
      {:else}
        <a
          href="/login"
          class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
                 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
        >
          <LogIn size={14} />
          <span class="hidden sm:inline">Sign in</span>
        </a>
      {/if}
      <SettingsPanel />
      <ThemeToggle />
    </div>
  </div>
</header>
