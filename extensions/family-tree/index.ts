import type { WikiExtension } from '../../src/lib/extensions/types.js'
import { FAMILY_TREE_SCHEMA, listFamilyTreeSummaries, resetFamilyTreeDbCache } from './db.js'
import { renderFamilyTreeEmbed } from './lib/embed.js'

const extension: WikiExtension = {
  name: 'Family Tree',
  version: '0.1.0',
  description: 'Interactive vertical family trees',
  manageHref: '/family-tree',
  schema: FAMILY_TREE_SCHEMA,
  writeGuardPaths: ['/family-tree', '/api/family-tree'],
  migrations: [
    {
      id: '001_millisecond_timestamps',
      sql: `
        DROP TRIGGER IF EXISTS family_trees_updated_at;
        CREATE TRIGGER IF NOT EXISTS family_trees_updated_at AFTER UPDATE ON family_trees BEGIN
          UPDATE family_trees SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = new.id;
        END;
      `
    }
  ],

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
      return { familyTrees: listFamilyTreeSummaries() }
    },

    onDatabaseReset() {
      resetFamilyTreeDbCache()
    }
  }
}

export default extension
