import { mount, unmount } from 'svelte'
import FamilyTreeCanvas from '../components/FamilyTreeCanvas.svelte'
import FamilyTreeEmbedError from '../components/FamilyTreeEmbedError.svelte'
import { decodeFamilyTreePayloadInBrowser } from '../lib/embed-payload-browser.js'
import { validateFamilyTreeData } from '../lib/validate.js'
import type { FamilyTreeData } from '../lib/types.js'

type Cleanup = () => void
type MountedInstance = ReturnType<typeof mount>

interface EmbedHandle {
  instance: MountedInstance | null
  abort?: () => void
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

function parseEmbeddedPayload(payload: string):
  | { ok: true; data: FamilyTreeData }
  | { ok: false; title: string; message: string } {
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

async function mountFromApi(
  target: HTMLElement,
  slug: string,
  existingPageSlugs: string[],
  isCancelled: () => boolean
): Promise<MountedInstance> {
  target.replaceChildren()
  target.textContent = 'Loading tree…'

  try {
    const response = await fetch(`/api/family-tree/${encodeURIComponent(slug)}`)
    if (isCancelled()) return mountError(target, 'Family tree load cancelled', 'Navigation interrupted the tree load.')

    if (response.status === 404) {
      return mountError(
        target,
        'Family tree not found',
        `No tree matches family="${slug}". Create one at /family-tree or check the slug in your template.`
      )
    }

    if (!response.ok) {
      return mountError(target, 'Could not load family tree', `The server returned HTTP ${response.status}.`)
    }

    const body = await response.json().catch(() => null)
    const result = validateFamilyTreeData(body?.data)
    if (isCancelled()) return mountError(target, 'Family tree load cancelled', 'Navigation interrupted the tree load.')

    if (!result.ok) {
      return mountError(target, 'Family tree data is corrupt', result.message)
    }

    target.replaceChildren()
    return mountCanvas(target, result.data, existingPageSlugs, true)
  } catch {
    if (isCancelled()) {
      return mountError(target, 'Family tree load cancelled', 'Navigation interrupted the tree load.')
    }
    return mountError(
      target,
      'Could not load family tree',
      'The tree request failed. Check your connection and refresh the page.'
    )
  }
}

/** Upgrades reader embed placeholders into interactive pan/zoom canvases. */
export function mountFamilyTreeEmbeds(root: HTMLElement): Cleanup {
  const handles: EmbedHandle[] = []
  let cancelled = false

  void (async () => {
    const existingPageSlugs = await fetchWikiPageSlugs()
    if (cancelled) return

    for (const element of root.querySelectorAll<HTMLElement>('.wiki-family-tree-embed[data-family]')) {
      if (cancelled) return
      if (element.dataset.ftMounted === 'true') continue

      const slug = element.dataset.family?.trim()
      const mountPoint = element.querySelector<HTMLElement>('.wiki-family-tree-embed__mount')
      if (!slug || !mountPoint) continue

      element.dataset.ftMounted = 'true'
      mountPoint.replaceChildren()

      const treePayload = element.getAttribute('data-tree') ?? element.dataset.tree ?? ''
      const parsed = parseEmbeddedPayload(treePayload)

      if (parsed.ok) {
        handles.push({ instance: mountCanvas(mountPoint, parsed.data, existingPageSlugs, true) })
        continue
      }

      if (treePayload.trim()) {
        handles.push({
          instance: mountError(mountPoint, parsed.title, parsed.message)
        })
        continue
      }

      const handle: EmbedHandle = {
        instance: null,
        abort: () => {
          cancelled = true
        }
      }
      handles.push(handle)

      void mountFromApi(mountPoint, slug, existingPageSlugs, () => cancelled).then((instance) => {
        if (cancelled) {
          unmount(instance)
          return
        }
        handle.instance = instance
      })
    }
  })()

  return () => {
    cancelled = true
    for (const handle of handles) {
      handle.abort?.()
      if (handle.instance) unmount(handle.instance)
    }

    for (const element of root.querySelectorAll<HTMLElement>('.wiki-family-tree-embed[data-ft-mounted="true"]')) {
      delete element.dataset.ftMounted
    }
  }
}
