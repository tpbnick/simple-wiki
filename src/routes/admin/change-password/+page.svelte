<script lang="ts">
  import { enhance } from '$app/forms'
  import { Eye, EyeOff, KeyRound } from 'lucide-svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let pending = $state(false)
  let showCurrent = $state(false)
  let showNew = $state(false)
  let showConfirm = $state(false)
</script>

<svelte:head>
  <title>Change Password — Wiki Admin</title>
</svelte:head>

<div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-base-200 p-4">
  <div class="w-full max-w-sm">

    <!-- Icon header -->
    <div class="text-center mb-8">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600
                  flex items-center justify-center shadow-lg mx-auto mb-4">
        <KeyRound size={22} class="text-white" />
      </div>
      <h1 class="text-2xl font-bold text-base-content">
        {data.mustChange ? 'Set your password' : 'Change password'}
      </h1>
      {#if data.mustChange}
        <p class="text-sm text-base-content/50 mt-1">
          Please set a new password before continuing.
        </p>
      {/if}
    </div>

    <!-- Card -->
    <div class="bg-base-100 rounded-2xl border border-base-200 shadow-lg p-6">
      {#if form?.error}
        <div class="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-error/10
                    border border-error/20 text-error text-sm mb-4" role="alert">
          {form.error}
        </div>
      {/if}

      <form
        method="POST"
        class="space-y-4"
        use:enhance={() => {
          pending = true
          return async ({ update }) => {
            try {
              await update()
            } finally {
              pending = false
            }
          }
        }}
      >
        {#if !data.mustChange}
          <div>
            <label for="current-password" class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5">
              Current password
            </label>
            <div class="relative">
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                name="current"
                required
                autocomplete="current-password"
                class="w-full h-10 px-3 pr-10 rounded-lg border border-base-300 bg-base-100
                       text-sm text-base-content focus:outline-none focus:ring-2
                       focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onclick={() => (showCurrent = !showCurrent)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40
                       hover:text-base-content transition-colors"
              >
                {#if showCurrent}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
              </button>
            </div>
          </div>
        {/if}

        <div>
          <label for="new-password" class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5">
            New password
          </label>
          <div class="relative">
            <input
              id="new-password"
              type={showNew ? 'text' : 'password'}
              name="next_password"
              minlength="8"
              required
              autocomplete="new-password"
              class="w-full h-10 px-3 pr-10 rounded-lg border border-base-300 bg-base-100
                     text-sm text-base-content focus:outline-none focus:ring-2
                     focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="button"
              onclick={() => (showNew = !showNew)}
              aria-label={showNew ? 'Hide password' : 'Show password'}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40
                     hover:text-base-content transition-colors"
            >
              {#if showNew}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
          <p class="text-xs text-base-content/40 mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <label for="confirm-password" class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5">
            Confirm new password
          </label>
          <div class="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              name="confirm"
              required
              autocomplete="new-password"
              class="w-full h-10 px-3 pr-10 rounded-lg border border-base-300 bg-base-100
                     text-sm text-base-content focus:outline-none focus:ring-2
                     focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="button"
              onclick={() => (showConfirm = !showConfirm)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40
                     hover:text-base-content transition-colors"
            >
              {#if showConfirm}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
        </div>

        <div class="flex gap-2 mt-2">
          {#if !data.mustChange}
            <a href="/admin" class="flex-1 h-10 rounded-lg border border-base-300 text-sm font-medium
                                   text-base-content/70 hover:bg-base-200 transition-all
                                   flex items-center justify-center">
              Cancel
            </a>
          {/if}
          <button
            type="submit"
            disabled={pending}
            class="flex-1 h-10 rounded-lg bg-primary text-primary-content text-sm font-semibold
                   hover:bg-primary/90 transition-all shadow-sm disabled:opacity-70
                   disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {#if pending}
              <span class="loading loading-spinner loading-xs"></span>
            {/if}
            Save password
          </button>
        </div>
      </form>
    </div>

  </div>
</div>
