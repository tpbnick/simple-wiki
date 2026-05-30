import type { WikiExtension } from '../../src/lib/extensions/types.js'
import { FAMILY_TREE_SCHEMA, listFamilyTrees, resetFamilyTreeDbCache } from './db.js'
import { renderFamilyTreeEmbed } from './lib/embed.js'

const extension: WikiExtension = {
  name: 'Family Tree',
  version: '0.1.0',
  description: 'Interactive vertical family trees',
  manageHref: '/family-tree',
  schema: FAMILY_TREE_SCHEMA,
  writeGuardPaths: ['/family-tree', '/api/family-tree'],

  hooks: {
    onEditorToolbarItems() {
      return [
        {
          id: 'family-tree',
          label: 'Family tree',
          description: 'Embed an interactive family tree on this page'
        }
      ]
    },

    onTemplateParse(name, params) {
      if (name !== 'FamilyTree') return null
      return renderFamilyTreeEmbed(params)
    },

    onEditorLoad(toolIds) {
      if (!toolIds.has('family-tree')) return {}
      return { familyTrees: listFamilyTrees() }
    },

    onDatabaseReset() {
      resetFamilyTreeDbCache()
    }
  }
}

export default extension
