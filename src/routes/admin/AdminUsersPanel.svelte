<script lang="ts">
  import { enhance } from '$app/forms'
  import { Check, Copy, KeyRound, Search, Shield, UserPlus, Users } from 'lucide-svelte'
  import { formatDateTime, formatTimeAgo, toDatetimeAttr } from '$lib/format.js'
  import type { ActionData } from './$types'

  let {
    users,
    form
  }: {
    users: Array<{
      username: string
      is_admin: number
      must_change_pw: number
      created_at: string
    }>
    form: ActionData
  } = $props()

  let filter = $state('')
  let copiedPassword = $state(false)

  const filtered = $derived(
    users.filter(user =>
      !filter || user.username.toLowerCase().includes(filter.toLowerCase())
    )
  )

  const adminCount = $derived(users.filter(user => user.is_admin).length)
  const editorCount = $derived(users.length - adminCount)

  function userInitial(username: string): string {
    return username.slice(0, 1).toUpperCase()
  }

  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password)
      copiedPassword = true
      setTimeout(() => {
        copiedPassword = false
      }, 2000)
    } catch {
      // Clipboard may be unavailable outside secure context.
    }
  }
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
  <section class="rounded-xl border border-base-200 p-5 h-fit">
    <div class="flex items-start gap-3 mb-4">
      <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <UserPlus size={16} class="text-primary" />
      </div>
      <div>
        <h2 class="font-semibold text-base-content">Create user</h2>
        <p class="text-sm text-base-content/60 mt-1">
          Add an editor or admin account. A one-time password is generated on creation.
        </p>
      </div>
    </div>

    {#if form?.userCreated}
      <div class="rounded-lg border border-success/30 bg-success/10 p-4 mb-4 text-sm">
        <p class="font-medium text-success-content">
          Created <strong>{form.userCreated.username}</strong>
        </p>
        <div class="mt-2 flex items-center gap-2">
          <code class="flex-1 font-mono text-xs bg-base-100/80 px-2 py-1.5 rounded border border-base-200 break-all">
            {form.userCreated.password}
          </code>
          <button
            type="button"
            onclick={() => copyPassword(form!.userCreated!.password)}
            class="w-8 h-8 flex items-center justify-center rounded-md border border-base-200 bg-base-100
                   hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors shrink-0"
            title="Copy password"
          >
            {#if copiedPassword}
              <Check size={14} class="text-success" />
            {:else}
              <Copy size={14} />
            {/if}
          </button>
        </div>
        <p class="text-xs mt-2 text-base-content/55">
          Share securely — the user must change this password on first login.
        </p>
      </div>
    {/if}

    {#if form && 'userError' in form && form.userError}
      <p class="text-error text-sm mb-4" role="alert">{form.userError}</p>
    {/if}

    <form method="POST" action="?/createUser" use:enhance class="space-y-4">
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-base-content/70">Username</span>
        <input
          type="text"
          name="username"
          required
          minlength="2"
          maxlength="32"
          pattern="[A-Za-z0-9_-]+"
          class="h-9 px-3 rounded-lg border border-base-300 bg-base-100
                 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="editor"
        />
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input type="checkbox" name="isAdmin" class="checkbox checkbox-sm mt-0.5" />
        <span class="text-base-content/70">
          Grant admin access
          <span class="block text-xs text-base-content/45 mt-0.5">Can manage pages, files, users, and backups.</span>
        </span>
      </label>
      <button
        type="submit"
        class="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
               bg-primary text-primary-content hover:bg-primary/90 transition-colors w-full justify-center"
      >
        <UserPlus size={14} />
        Create user
      </button>
    </form>
  </section>

  <section>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[12rem] max-w-xs">
        <Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
        <input
          type="search"
          placeholder="Filter users…"
          bind:value={filter}
          class="w-full h-8 pl-8 pr-3 rounded-lg border border-base-300 bg-base-100
                 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
      <div class="flex items-center gap-2 ml-auto text-xs">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-base-200 text-base-content/65 font-medium">
          <Users size={12} />
          {users.length} total
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">
          <Shield size={12} />
          {adminCount} admin{adminCount === 1 ? '' : 's'}
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-base-200 text-base-content/65 font-medium">
          {editorCount} editor{editorCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>

    <div class="rounded-xl border border-base-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-base-200/60 border-b border-base-200">
            <th class="text-left px-4 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">User</th>
            <th class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Role</th>
            <th class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Status</th>
            <th class="text-left px-3 py-2.5 font-semibold text-base-content/60 text-xs uppercase tracking-wider">Created</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-base-200">
          {#each filtered as user}
            <tr class="hover:bg-base-200/30 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                           {user.is_admin ? 'bg-primary/15 text-primary' : 'bg-base-200 text-base-content/60'}"
                  >
                    {userInitial(user.username)}
                  </div>
                  <div>
                    <p class="font-medium text-base-content">{user.username}</p>
                    <p class="text-xs text-base-content/35 font-mono">@{user.username}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3">
                {#if user.is_admin}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-primary/10 text-primary font-medium">
                    <Shield size={11} />
                    Admin
                  </span>
                {:else}
                  <span class="px-2 py-0.5 rounded-md text-xs bg-base-200 text-base-content/60 font-medium">
                    Editor
                  </span>
                {/if}
              </td>
              <td class="px-3 py-3">
                {#if user.must_change_pw}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-warning/10 text-warning font-medium">
                    <KeyRound size={11} />
                    Must change password
                  </span>
                {:else}
                  <span class="px-2 py-0.5 rounded-md text-xs bg-success/10 text-success font-medium">
                    Active
                  </span>
                {/if}
              </td>
              <td class="px-3 py-3 text-base-content/50 text-xs">
                <time datetime={toDatetimeAttr(user.created_at)} title={formatDateTime(user.created_at)}>
                  {formatTimeAgo(user.created_at, 'short')}
                </time>
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr>
              <td colspan="4" class="text-center py-12 text-base-content/30 text-sm">No users found</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>
