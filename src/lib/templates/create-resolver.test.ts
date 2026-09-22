import { describe, expect, it } from 'vitest'
import { createWikiTemplateResolver } from './create-resolver.js'

describe('createWikiTemplateResolver', () => {
  it('does not special-case extension templates in core', () => {
    const resolver = createWikiTemplateResolver()
    expect(resolver('FamilyTree', { family: 'demo' })).toBeNull()
  })

  it('uses onExtensionTemplate when an extension handles the name', () => {
    const resolver = createWikiTemplateResolver({
      onExtensionTemplate: (name) => (name === 'FamilyTree' ? '<div>tree</div>' : null)
    })
    expect(resolver('FamilyTree', { family: 'demo' })).toBe('<div>tree</div>')
  })
})
