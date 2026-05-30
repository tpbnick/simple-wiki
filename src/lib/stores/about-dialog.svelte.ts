class AboutDialogStore {
  isOpen = $state(false)

  show() {
    this.isOpen = true
  }

  close() {
    this.isOpen = false
  }
}

export const aboutDialogStore = new AboutDialogStore()
