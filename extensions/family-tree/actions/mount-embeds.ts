import { mount, unmount } from 'svelte'
import FamilyTreeCanvas from '../components/FamilyTreeCanvas.svelte'
import FamilyTreeEmbedError from '../components/FamilyTreeEmbedError.svelte'
import { decodeFamilyTreePayloadInBrowser } from '../lib/embed-payload-browser.js'
import { validateFamilyTreeData } from '../lib/validate.js'
import type { FamilyTreeData } from '../lib/types.js'

type MountedInstance = ReturnType<typeof mount>

type CachedEmbed = {
  signature: string
  instance: MountedInstance
  mountPoint: HTMLElement | null
  heldNodes: DocumentFragment | null
}

let cachedWikiPageSlugs: string[] | null = null
let wikiPageSlugsPromise: Promise<string[]> | null = null

function resetWikiPageSlugsCache(): void {
  cachedWikiPageSlugs = null
  wikiPageSlugsPromise = null
}

function readWikiPageSlugsFromRoot(root: HTMLElement): string[] | undefined {
  const raw = root.dataset.wikiPageSlugs
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return undefined
    return parsed.filter((slug): slug is string => typeof slug === 'string')
  } catch {
    return undefined
  }
}

async function fetchWikiPageSlugs(): Promise<string[]> {
  try {
    const response = await fetch('/api/pages/slugs')
    if (!response.ok) return []
    const body = await response.json().catch(() => null)
    return Array.isArray(body?.slugs)
      ? body.slugs.filter((slug: unknown): slug is string => typeof slug === 'string')
      : []
  } catch {
    return []
  }
}

/** Resolves wiki slugs from a preloaded list, root data attribute, or one cached API fetch. */
async function resolveWikiPageSlugs(root: HTMLElement): Promise<string[]> {
  const fromRoot = readWikiPageSlugsFromRoot(root)
  if (fromRoot) return fromRoot

  if (cachedWikiPageSlugs) return cachedWikiPageSlugs

  if (!wikiPageSlugsPromise) {
    wikiPageSlugsPromise = fetchWikiPageSlugs().then((slugs) => {
      cachedWikiPageSlugs = slugs
      return slugs
    })
  }

  return wikiPageSlugsPromise
}

function familyTreeEmbedSignature(slug: string, treePayload: string): string {
  return `${slug}\0${treePayload}`
}

function mountCanvas(
  target: HTMLElement,
  data: FamilyTreeData,
  existingPageSlugs: string[],
  fitOnLoad = false
): MountedInstance {
  return mount(FamilyTreeCanvas, {
    target,
    props: { data, existingPageSlugs, fitOnLoad }
  })
}

function mountError(target: HTMLElement, title: string, message: string): MountedInstance {
  return mount(FamilyTreeEmbedError, {
    target,
    props: { title, message }
  })
}

function parseEmbeddedPayload(
  payload: string
): { ok: true; data: FamilyTreeData } | { ok: false; title: string; message: string } {
  if (!payload.trim()) {
    return {
      ok: false,
      title: 'Family tree data is missing',
      message: 'This embed did not include tree data. Refresh the page or re-save the wiki article.'
    }
  }

  try {
    const parsed = decodeFamilyTreePayloadInBrowser(payload)
    const result = validateFamilyTreeData(parsed)
    if (result.ok) return result
    return {
      ok: false,
      title: 'Family tree data is corrupt',
      message: result.message
    }
  } catch {
    return {
      ok: false,
      title: 'Family tree data is corrupt',
      message: 'The embedded tree payload could not be read.'
    }
  }
}

function holdMountedNodes(mountPoint: HTMLElement, entry: CachedEmbed): void {
  const fragment = document.createDocumentFragment()
  while (mountPoint.firstChild) {
    fragment.appendChild(mountPoint.firstChild)
  }
  entry.heldNodes = fragment
  entry.mountPoint = null
}

function attachHeldNodes(mountPoint: HTMLElement, entry: CachedEmbed): void {
  mountPoint.replaceChildren()
  if (entry.heldNodes) {
    mountPoint.appendChild(entry.heldNodes)
    entry.heldNodes = null
  }
  entry.mountPoint = mountPoint
}

type TreeFetchResult =
  | { ok: true; data: FamilyTreeData }
  | { ok: false; title: string; message: string }

async function fetchTreeData(slug: string, isCancelled: () => boolean): Promise<TreeFetchResult> {
  try {
    const response = await fetch(`/api/family-tree/${encodeURIComponent(slug)}`)
    if (isCancelled()) {
      return {
        ok: false,
        title: 'Family tree load cancelled',
        message: 'Navigation interrupted the tree load.'
      }
    }

    if (response.status === 404) {
      return {
        ok: false,
        title: 'Family tree not found',
        message: `No tree matches family="${slug}". Create one at /family-tree or check the slug in your template.`
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        title: 'Could not load family tree',
        message: `The server returned HTTP ${response.status}.`
      }
    }

    const body = await response.json().catch(() => null)
    const result = validateFamilyTreeData(body?.data)
    if (isCancelled()) {
      return {
        ok: false,
        title: 'Family tree load cancelled',
        message: 'Navigation interrupted the tree load.'
      }
    }

    if (!result.ok) {
      return {
        ok: false,
        title: 'Family tree data is corrupt',
        message: result.message
      }
    }

    return { ok: true, data: result.data }
  } catch {
    if (isCancelled()) {
      return {
        ok: false,
        title: 'Family tree load cancelled',
        message: 'Navigation interrupted the tree load.'
      }
    }
    return {
      ok: false,
      title: 'Could not load family tree',
      message: 'The tree request failed. Check your connection and refresh the page.'
    }
  }
}

/** Reuses mounted canvases across {@html} swaps when slug/payload are unchanged. */
export function createFamilyTreeEmbedCache() {
  const live = new Set<CachedEmbed>()
  const pendingTreeData = new Map<string, Promise<TreeFetchResult>>()
  let syncQueue: Promise<void> = Promise.resolve()
  let syncGeneration = 0

  function removeEntry(entry: CachedEmbed): void {
    unmount(entry.instance)
    live.delete(entry)
  }

  function findDetachedHeld(signature: string): CachedEmbed | undefined {
    for (const entry of live) {
      if (entry.signature === signature && entry.mountPoint === null && entry.heldNodes) {
        return entry
      }
    }
    return undefined
  }

  function findLiveAtMountPoint(mountPoint: HTMLElement): CachedEmbed | undefined {
    for (const entry of live) {
      if (entry.mountPoint === mountPoint) return entry
    }
    return undefined
  }

  async function loadTreeData(slug: string, isCancelled: () => boolean): Promise<TreeFetchResult> {
    let pending = pendingTreeData.get(slug)
    if (!pending) {
      pending = fetchTreeData(slug, isCancelled).finally(() => {
        pendingTreeData.delete(slug)
      })
      pendingTreeData.set(slug, pending)
    }
    return pending
  }

  async function mountFromApi(
    mountPoint: HTMLElement,
    slug: string,
    existingPageSlugs: string[],
    isCancelled: () => boolean
  ): Promise<CachedEmbed> {
    mountPoint.replaceChildren()
    mountPoint.textContent = 'Loading tree…'

    const fetched = await loadTreeData(slug, isCancelled)
    if (isCancelled()) {
      const entry: CachedEmbed = {
        signature: familyTreeEmbedSignature(slug, ''),
        instance: mountError(
          mountPoint,
          'Family tree load cancelled',
          'Navigation interrupted the tree load.'
        ),
        mountPoint,
        heldNodes: null
      }
      live.add(entry)
      return entry
    }

    mountPoint.replaceChildren()
    const signature = familyTreeEmbedSignature(slug, '')

    if (!fetched.ok) {
      const entry: CachedEmbed = {
        signature,
        instance: mountError(mountPoint, fetched.title, fetched.message),
        mountPoint,
        heldNodes: null
      }
      live.add(entry)
      return entry
    }

    const entry: CachedEmbed = {
      signature,
      instance: mountCanvas(mountPoint, fetched.data, existingPageSlugs, true),
      mountPoint,
      heldNodes: null
    }
    live.add(entry)
    return entry
  }

  async function syncInternal(root: HTMLElement, isCancelled: () => boolean): Promise<void> {
    const existingPageSlugs = await resolveWikiPageSlugs(root)
    if (isCancelled()) return

    const seen = new Set<CachedEmbed>()

    for (const element of root.querySelectorAll<HTMLElement>(
      '.wiki-family-tree-embed[data-family]'
    )) {
      if (isCancelled()) return

      const slug = element.dataset.family?.trim()
      const mountPoint = element.querySelector<HTMLElement>('.wiki-family-tree-embed__mount')
      if (!slug || !mountPoint) continue

      const treePayload = element.getAttribute('data-tree') ?? element.dataset.tree ?? ''
      const signature = familyTreeEmbedSignature(slug, treePayload)

      const liveEntry = findLiveAtMountPoint(mountPoint)
      if (liveEntry?.signature === signature) {
        attachHeldNodes(mountPoint, liveEntry)
        seen.add(liveEntry)
        continue
      }

      if (liveEntry) {
        removeEntry(liveEntry)
      }

      const detached = findDetachedHeld(signature)
      if (detached) {
        attachHeldNodes(mountPoint, detached)
        seen.add(detached)
        continue
      }

      mountPoint.replaceChildren()

      const parsed = parseEmbeddedPayload(treePayload)
      if (parsed.ok) {
        const entry: CachedEmbed = {
          signature,
          instance: mountCanvas(mountPoint, parsed.data, existingPageSlugs, true),
          mountPoint,
          heldNodes: null
        }
        live.add(entry)
        seen.add(entry)
        continue
      }

      if (treePayload.trim()) {
        const entry: CachedEmbed = {
          signature,
          instance: mountError(mountPoint, parsed.title, parsed.message),
          mountPoint,
          heldNodes: null
        }
        live.add(entry)
        seen.add(entry)
        continue
      }

      const entry = await mountFromApi(mountPoint, slug, existingPageSlugs, isCancelled)
      if (isCancelled()) {
        removeEntry(entry)
        return
      }
      seen.add(entry)
    }

    for (const entry of [...live]) {
      if (!seen.has(entry)) removeEntry(entry)
    }
  }

  function sync(root: HTMLElement, isCancelled: () => boolean): void {
    const generation = ++syncGeneration
    syncQueue = syncQueue
      .then(async () => {
        if (isCancelled() || generation !== syncGeneration) return
        await syncInternal(root, () => isCancelled() || generation !== syncGeneration)
      })
      .catch(() => {})
  }

  /** Call before {@html} replaces article markup so canvas DOM can be reattached after. */
  function detachForHtmlSwap(root: HTMLElement): void {
    for (const element of root.querySelectorAll<HTMLElement>(
      '.wiki-family-tree-embed[data-family]'
    )) {
      const mountPoint = element.querySelector<HTMLElement>('.wiki-family-tree-embed__mount')
      if (!mountPoint) continue

      const entry = findLiveAtMountPoint(mountPoint)
      if (entry && mountPoint.childNodes.length > 0) {
        holdMountedNodes(mountPoint, entry)
      }
    }
  }

  function destroy(): void {
    syncGeneration += 1
    for (const entry of [...live]) {
      removeEntry(entry)
    }
    pendingTreeData.clear()
    resetWikiPageSlugsCache()
  }

  return { sync, detachForHtmlSwap, destroy }
}
