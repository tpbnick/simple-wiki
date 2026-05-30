<script lang="ts">
  import { enhance } from '$app/forms'
  import { BookOpen, Eye, EyeOff } from 'lucide-svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let pending = $state(false)
  let showPassword = $state(false)
</script>

<svelte:head>
  <title>Sign in — Wiki</title>
</svelte:head>

<div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-base-200 p-4">
  <div class="w-full max-w-sm">

    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center shadow-lg mx-auto mb-4">
        <BookOpen size={22} class="text-white" />
      </div>
      <h1 class="text-2xl font-bold text-base-content">Welcome back</h1>
      <p class="text-sm text-base-content/50 mt-1">Sign in to edit this wiki</p>
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
        <input type="hidden" name="next" value={data.next} />

        <div>
          <label for="username" class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <input
            id="username"
            type="text"
            name="username"
            value={(form as { username?: string } | null)?.username ?? ''}
            autocomplete="username"
            required
            class="w-full h-10 px-3 rounded-lg border border-base-300 bg-base-100
                   text-sm text-base-content placeholder:text-base-content/30
                   focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                   transition-all"
          />
        </div>

        <div>
          <label for="password" class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autocomplete="current-password"
              required
              class="w-full h-10 px-3 pr-10 rounded-lg border border-base-300 bg-base-100
                     text-sm text-base-content
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                     transition-all"
            />
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40
                     hover:text-base-content transition-colors"
            >
              {#if showPassword}
                <EyeOff size={15} />
              {:else}
                <Eye size={15} />
              {/if}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          class="w-full h-10 rounded-lg bg-primary text-primary-content text-sm font-semibold
                 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm mt-2
                 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if pending}
            <span class="loading loading-spinner loading-xs"></span>
          {/if}
          Sign in
        </button>
      </form>
    </div>

    <p class="text-center text-xs text-base-content/35 mt-5">
      Visitors can browse the wiki without signing in
    </p>
  </div>
</div>
