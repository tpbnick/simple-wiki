import { describe, expect, it } from 'vitest'
import { parseCreatedFamilyTree } from './create-tree-client.js'
import { createEmptyTree } from './model.js'

describe('parseCreatedFamilyTree', () => {
  it('accepts a valid create response', () => {
    const data = createEmptyTree('Smith')
    expect(parseCreatedFamilyTree({ slug: 'smith', title: 'Smith', data })).toEqual({
      slug: 'smith',
      title: 'Smith',
      data
    })
  })

  it('rejects missing fields or corrupt tree data', () => {
    expect(() => parseCreatedFamilyTree(null)).toThrow('Could not create family tree')
    expect(() => parseCreatedFamilyTree({ title: 'Smith' })).toThrow('Could not create family tree')
    expect(() => parseCreatedFamilyTree({ slug: 'smith', title: 'Smith', data: {} })).toThrow(
      'corrupt'
    )
  })
})
