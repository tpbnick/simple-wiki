import { describe, expect, it } from 'vitest'
import { addChild, addSpouse, createEmptyTree } from './model.js'
import { layoutFamilyTree } from './layout.js'
import { computeInitialTreeView } from './viewport.js'

describe('computeInitialTreeView', () => {
  it('zooms out and centers on the root person', () => {
    let data = createEmptyTree('Root')
    data = addSpouse(data, data.rootId, 'Partner')
    data = addChild(data, data.rootId, 'Child')

    const layout = layoutFamilyTree(data)
    const offsetX = layout.width / 2
    const view = computeInitialTreeView(layout, data.rootId, offsetX, 800, 520)

    expect(view.scale).toBeLessThan(1)
    expect(view.scale).toBeGreaterThan(0.35)
  })
})
