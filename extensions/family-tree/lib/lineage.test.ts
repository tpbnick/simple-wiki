import { describe, expect, it } from 'vitest'
import { addChild, addSpouse, createEmptyTree } from './model.js'
import { getPaternalLineage } from './lineage.js'

describe('getPaternalLineage', () => {
  it('walks up through the first parent at each generation', () => {
    let data = createEmptyTree('Grandfather')
    const grandfatherId = data.rootId
    data = addSpouse(data, grandfatherId, 'Grandmother')
    data = addChild(data, grandfatherId, 'Father')
    const fatherId = Object.values(data.people).find((person) => person.name === 'Father')!.id
    data = addChild(data, fatherId, 'Child')
    const childId = Object.values(data.people).find((person) => person.name === 'Child')!.id

    const lineage = getPaternalLineage(childId, data)

    expect(lineage.personIds.has(childId)).toBe(true)
    expect(lineage.personIds.has(fatherId)).toBe(true)
    expect(lineage.personIds.has(grandfatherId)).toBe(true)
    expect(lineage.childEdgeIds.has(childId)).toBe(true)
    expect(lineage.childEdgeIds.has(fatherId)).toBe(true)
    expect(lineage.childEdgeIds.has(grandfatherId)).toBe(false)
  })
})
