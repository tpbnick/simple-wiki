import { describe, expect, it } from 'vitest'
import { shouldShowReaderSidebar, isReaderViewPath } from './reader-view.js'

describe('isReaderViewPath', () => {
  it('allows the home page and wiki article reader routes', () => {
    expect(isReaderViewPath('/')).toBe(true)
    expect(isReaderViewPath('/wiki/home')).toBe(true)
    expect(isReaderViewPath('/wiki/fischbach-bei-dahn')).toBe(true)
  })

  it('blocks utility and editing routes', () => {
    expect(isReaderViewPath('/search')).toBe(false)
    expect(isReaderViewPath('/search?q=fisch')).toBe(false)
    expect(isReaderViewPath('/pages')).toBe(false)
    expect(isReaderViewPath('/recent')).toBe(false)
    expect(isReaderViewPath('/login')).toBe(false)
    expect(isReaderViewPath('/admin')).toBe(false)
    expect(isReaderViewPath('/admin/change-password')).toBe(false)
    expect(isReaderViewPath('/wiki/home/edit')).toBe(false)
    expect(isReaderViewPath('/wiki/home/history')).toBe(false)
  })
})

describe('shouldShowReaderSidebar', () => {
  it('requires a reader route and toc entries', () => {
    expect(shouldShowReaderSidebar('/', 3)).toBe(true)
    expect(shouldShowReaderSidebar('/', 0)).toBe(false)
    expect(shouldShowReaderSidebar('/search', 3)).toBe(false)
  })

  it('shows the sidebar when extension nav items exist without toc entries', () => {
    expect(shouldShowReaderSidebar('/', 0, 1)).toBe(true)
    expect(shouldShowReaderSidebar('/wiki/home', 0, 2)).toBe(true)
    expect(shouldShowReaderSidebar('/search', 0, 1)).toBe(false)
  })
})
