import { describe, expect, it } from 'vitest'
import { createEmptyTree } from './model.js'
import { validateFamilyTreeData } from './validate.js'

describe('validateFamilyTreeData', () => {
  it('accepts a valid tree', () => {
    const data = createEmptyTree('Root')
    expect(validateFamilyTreeData(data).ok).toBe(true)
  })

  it('rejects missing root person', () => {
    const data = createEmptyTree('Root')
    delete data.people[data.rootId]

    const result = validateFamilyTreeData(data)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('root person')
  })

  it('rejects invalid parent references', () => {
    const data = createEmptyTree('Root')
    data.people[data.rootId] = {
      ...data.people[data.rootId],
      parentIds: ['missing-parent']
    }

    const result = validateFamilyTreeData(data)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('missing parent')
  })

  it('rejects unsafe image URLs', () => {
    const data = createEmptyTree('Root')
    data.people[data.rootId] = {
      ...data.people[data.rootId],
      imageUrl: 'javascript:alert(1)'
    }

    const result = validateFamilyTreeData(data)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('unsafe image URL')
  })
})
