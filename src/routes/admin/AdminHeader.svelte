<script lang="ts">
import {
  FileText,
  FolderOpen,
  Clock,
  Layers,
  Puzzle,
  Users,
  DatabaseBackup,
  LayoutDashboard,
  Key
} from 'lucide-svelte'

let {
  tab,
  pageCount,
  fileCount,
  recentCount,
  templateCount,
  extensionCount,
  userCount
}: {
  tab: string
  pageCount: number
  fileCount: number
  recentCount: number
  templateCount: number
  extensionCount: number
  userCount: number
} = $props()

const tabs = $derived([
  { id: 'pages', label: 'Pages', icon: FileText, count: pageCount },
  { id: 'files', label: 'Files', icon: FolderOpen, count: fileCount },
  { id: 'recent', label: 'Recent Changes', icon: Clock, count: recentCount },
  { id: 'templates', label: 'Templates', icon: Layers, count: templateCount },
  { id: 'extensions', label: 'Extensions', icon: Puzzle, count: extensionCount },
  { id: 'users', label: 'Users', icon: Users, count: userCount },
  { id: 'backups', label: 'Backups', icon: DatabaseBackup, count: undefined as number | undefined }
])
</script>

<div class="border-b border-base-200 px-6 py-5 lg:px-8">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center">
        <LayoutDashboard size={17} class="text-base-content/60" />
      </div>
      <div>
        <h1 class="text-lg font-bold text-base-content">Admin Dashboard</h1>
        <p class="text-xs text-base-content/40">
          {pageCount} pages · {fileCount} files
        </p>
      </div>
    </div>
    <div class="flex gap-2">
      <a
        href="/admin/change-password"
        class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-base-content/60
               hover:bg-base-200 hover:text-base-content border border-base-300 transition-all"
      >
        <Key size={13} />
        <span class="hidden sm:inline">Password</span>
      </a>
      <a
        href="/"
        class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium
               bg-primary text-primary-content hover:bg-primary/90 transition-colors"
      >
        View wiki
      </a>
    </div>
  </div>

  <div class="flex gap-0.5 mt-4 -mb-5 overflow-x-auto" role="tablist" aria-label="Admin sections">
    {#each tabs as t}
      <a
        href="/admin?tab={t.id}"
        role="tab"
        aria-selected={tab === t.id}
        data-sveltekit-replacestate
        data-sveltekit-keepfocus
        data-sveltekit-noscroll
        class="flex items-center gap-1.5 px-3 pb-3 pt-1 text-sm font-medium transition-colors whitespace-nowrap
               {tab === t.id
          ? 'text-primary border-b-2 border-primary -mb-px'
          : 'text-base-content/50 hover:text-base-content'}"
      >
        <t.icon size={13} />
        {t.label}
        {#if t.count !== undefined}
          <span
            class="px-1.5 py-0.5 rounded-full text-xs font-semibold
                       {tab === t.id
              ? 'bg-primary/15 text-primary'
              : 'bg-base-200 text-base-content/50'}"
          >
            {t.count}
          </span>
        {/if}
      </a>
    {/each}
  </div>
</div>
