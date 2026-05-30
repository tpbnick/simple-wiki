import { describe, expect, it } from 'vitest'
import { databaseSwapInProgressHtml, prefersHtmlResponse } from '$lib/server/swap-response.js'

describe('prefersHtmlResponse', () => {
  it('returns true for browser page navigations', () => {
    const request = new Request('http://localhost/wiki/home', {
      headers: { accept: 'text/html,application/xhtml+xml' }
    })

    expect(prefersHtmlResponse(request, '/wiki/home')).toBe(true)
  })

  it('returns false for API routes', () => {
    const request = new Request('http://localhost/api/pages/home', {
      headers: { accept: 'text/html' }
    })

    expect(prefersHtmlResponse(request, '/api/pages/home')).toBe(false)
  })

  it('returns true for page routes without an explicit html accept header', () => {
    const request = new Request('http://localhost/wiki/home', {
      headers: { accept: 'application/json' }
    })

    expect(prefersHtmlResponse(request, '/wiki/home')).toBe(true)
  })

  it('returns true for SvelteKit client navigation requests', () => {
    const request = new Request('http://localhost/recent', {
      headers: {
        accept: '*/*',
        'x-sveltekit-page': 'true'
      }
    })

    expect(prefersHtmlResponse(request, '/recent')).toBe(true)
  })
})

describe('databaseSwapInProgressHtml', () => {
  it('returns a readable HTML page', () => {
    expect(databaseSwapInProgressHtml()).toContain('Database restore in progress')
  })
})
