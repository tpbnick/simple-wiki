declare global {
  namespace App {
    interface Locals {
      user?: {
        id: number
        username: string
        mustChangePw: boolean
        isAdmin: boolean
      }
    }
  }
}

export {}
