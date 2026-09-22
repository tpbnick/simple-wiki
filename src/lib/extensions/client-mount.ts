import { extensionIdFromGlobPath } from './client-id.js'

export interface ArticleMount {
  sync(root: HTMLElement, isCancelled: () => boolean): void
  detachForHtmlSwap(root: HTMLElement): void
  destroy(): void
}

const mountModules = import.meta.glob<{ createArticleMount?: () => ArticleMount }>(
  '../../../extensions/*/actions/mount.ts',
  { eager: true }
)

/** Per-article controller that reuses extension embeds across preview HTML updates. */
export function createExtensionArticleMountController(): {
  sync(root: HTMLElement, isCancelled: () => boolean, enabledIds?: Iterable<string>): void
  detachForHtmlSwap(root: HTMLElement): void
  destroy(): void
} {
  const mounts = Object.entries(mountModules).flatMap(([path, module]) => {
    const id = extensionIdFromGlobPath(path)
    const mount = module.createArticleMount?.()
    return id && mount ? [{ id, mount }] : []
  })

  return {
    sync(root, isCancelled, enabledIds = []) {
      const allowed = new Set(enabledIds)
      for (const { id, mount } of mounts) {
        if (allowed.has(id)) mount.sync(root, isCancelled)
      }
    },
    detachForHtmlSwap(root) {
      for (const { mount } of mounts) mount.detachForHtmlSwap(root)
    },
    destroy() {
      for (const { mount } of mounts) mount.destroy()
    }
  }
}
