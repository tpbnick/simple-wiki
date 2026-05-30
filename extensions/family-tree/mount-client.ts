import { mountFamilyTreeEmbeds } from './actions/mount-embeds.js'

/** Client-side hook: hydrates family tree embeds in article HTML. */
export default function mountFamilyTreeExtensionEmbeds(root: HTMLElement): () => void {
  return mountFamilyTreeEmbeds(root)
}
