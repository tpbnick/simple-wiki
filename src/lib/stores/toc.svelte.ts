import type { TocEntry } from '$lib/markdown/index.js'

class TocStore {
  entries = $state<TocEntry[]>([])

  set(entries: TocEntry[]) {
    this.entries = entries
  }

  clear() {
    this.entries = []
  }
}

export const tocStore = new TocStore()
