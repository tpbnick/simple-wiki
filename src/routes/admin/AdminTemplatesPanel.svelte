<script lang="ts">
  import { Pencil, Plus, Trash2 } from 'lucide-svelte'
  import { formatTimeAgo, toDatetimeAttr, formatDateTime } from '$lib/format.js'
  import type { AdminDeleteTarget } from './admin-types.js'

  let {
    templates,
    onDelete
  }: {
    templates: Array<{ slug: string; title: string; updated_at: string }>
    onDelete: (target: AdminDeleteTarget) => void
  } = $props()
</script>

<div class="mb-4 flex justify-end">
  <a href="/wiki/new/edit?ns=template"
    class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
           bg-primary text-primary-content hover:bg-primary/90 transition-colors">
    <Plus size={14} />
    New template
  </a>
</div>

<div class="rounded-xl border border-base-200 overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-base-200/60 border-b border-base-200">
        <th class="text-left px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Name</th>
        <th class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Updated</th>
        <th class="text-right px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-base-200">
      {#each templates as tmpl}
        <tr class="hover:bg-base-200/30 transition-colors group">
          <td class="px-4 py-3">
            <span class="font-medium text-base-content">{tmpl.title}</span>
            <div class="text-xs text-base-content/35 font-mono">{'{{' + tmpl.title + '}}'}</div>
          </td>
          <td class="px-3 py-3 text-base-content/50 text-xs">
            <time datetime={toDatetimeAttr(tmpl.updated_at)} title={formatDateTime(tmpl.updated_at)}>
              {formatTimeAgo(tmpl.updated_at, 'short')}
            </time>
          </td>
          <td class="px-4 py-3">
            <div class="flex gap-1 justify-end opacity-100 lg:opacity-70 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <a href="/wiki/{tmpl.slug}/edit"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-200 text-base-content/50 hover:text-base-content transition-all"
                title="Edit"><Pencil size={13} /></a>
              <button
                onclick={() => onDelete({ type: 'page', id: tmpl.slug, label: tmpl.title })}
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error/10 text-base-content/50 hover:text-error transition-all"
                title="Delete"><Trash2 size={13} /></button>
            </div>
          </td>
        </tr>
      {/each}
      {#if templates.length === 0}
        <tr><td colspan="3" class="text-center py-12 text-base-content/30 text-sm">No templates yet.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
