const familyTreeNodeStylePattern = /^left: [\d.]+px; top: [\d.]+px; width: [\d.]+px;?$/
const familyTreeCanvasStylePattern = /^width: [\d.]+px; height: [\d.]+px;$/

export const classTokens = ['ft-']
export const divStylePatterns = [familyTreeNodeStylePattern, familyTreeCanvasStylePattern]
export const divAttrs = ['dataFamily']
export const extraAttributes = {
  line: [['className', /^ft-edge/]]
}
