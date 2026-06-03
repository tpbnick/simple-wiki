import { createFamilyTreeEmbedCache } from '$extensions/family-tree/actions/mount-embeds.js'

/** Per-article controller that reuses extension embeds across preview HTML updates. */
export function createExtensionArticleMountController() {
  const familyTreeCache = createFamilyTreeEmbedCache()

  return {
    sync(root: HTMLElement, isCancelled: () => boolean): void {
      familyTreeCache.sync(root, isCancelled)
    },
    detachForHtmlSwap(root: HTMLElement): void {
      familyTreeCache.detachForHtmlSwap(root)
    },
    destroy(): void {
      familyTreeCache.destroy()
    }
  }
}
