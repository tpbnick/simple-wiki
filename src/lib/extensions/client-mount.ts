/** Eagerly loaded extension client mounts. */
const globMounts = import.meta.glob('$extensions/*/mount-client.ts', {
  eager: true,
  import: 'default'
}) as Record<string, (root: HTMLElement) => () => void>

const extensionMounts = Object.values(globMounts).filter(
  (mount): mount is (root: HTMLElement) => () => void => typeof mount === 'function'
)

/** Runs client-side mount hooks from all extensions (e.g. interactive embeds). */
export function runExtensionArticleMounts(root: HTMLElement): () => void {
  const cleanups = extensionMounts.map((mount) => mount(root))

  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}
