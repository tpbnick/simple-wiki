import type { TreeLayout } from './types.js'
import { NODE_HEIGHT, NODE_WIDTH } from './types.js'

export interface TreeViewportState {
  panX: number
  panY: number
  scale: number
}

/** Centers the root person near the top and zooms out to fit the full tree. */
export function computeInitialTreeView(
  layout: TreeLayout,
  rootId: string,
  offsetX: number,
  viewportWidth: number,
  viewportHeight: number
): TreeViewportState {
  const padding = 40
  const root = layout.nodes.find((node) => node.person.id === rootId)

  if (!root || viewportWidth <= 0 || viewportHeight <= 0) {
    return { panX: 0, panY: 0, scale: 0.85 }
  }

  const xs = layout.nodes.map((node) => node.x + offsetX)
  const ys = layout.nodes.map((node) => node.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs) + NODE_WIDTH
  const minY = Math.min(...ys)
  const maxY = Math.max(...layout.nodes.map((node) => node.y + node.height))
  const treeWidth = maxX - minX
  const treeHeight = maxY - minY

  const fitScale = Math.min(
    (viewportWidth - padding * 2) / treeWidth,
    (viewportHeight - padding * 2) / treeHeight,
    1
  )

  const scale = Math.max(0.35, Math.min(1, fitScale * 0.82))

  const rootCenterX = root.x + offsetX + NODE_WIDTH / 2
  const rootTop = root.y

  let panX = viewportWidth / 2 - rootCenterX * scale
  let panY = padding - rootTop * scale

  const scaledMinX = minX * scale + panX
  const scaledMaxX = maxX * scale + panX
  const scaledMaxY = maxY * scale + panY

  if (scaledMaxX > viewportWidth - padding) {
    panX -= scaledMaxX - (viewportWidth - padding)
  }
  if (scaledMinX < padding) {
    panX += padding - scaledMinX
  }
  if (scaledMaxY > viewportHeight - padding) {
    panY -= scaledMaxY - (viewportHeight - padding)
  }

  return { panX, panY, scale }
}
