class SidebarStore {
  open = $state(true)
  enabled = $state(true)

  get isOpen() {
    return this.enabled ? this.open : false
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  toggle() {
    if (!this.enabled) return
    this.open = !this.open
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wiki-sidebar', this.open ? '1' : '0')
    }
  }

  close() {
    this.open = false
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wiki-sidebar', '0')
    }
  }

  init() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('wiki-sidebar')
      if (saved !== null) this.open = saved === '1'
    }
  }
}

export const sidebarStore = new SidebarStore()
