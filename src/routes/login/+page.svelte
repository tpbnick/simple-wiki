<script lang="ts">
import { enhance } from '$app/forms'
import { AlertCircle, BookOpen, Eye, EyeOff, X } from 'lucide-svelte'
import type { PageData, ActionData } from './$types'

let { data, form }: { data: PageData; form: ActionData } = $props()

let pending = $state(false)
let showPassword = $state(false)
let clientError = $state<string | null>(null)
let errorDismissed = $state(false)

const loginError = $derived(errorDismissed ? null : (form?.error ?? clientError))

function loginErrorMessage(result: {
  type?: string
  data?: { error?: string }
  message?: string
  status?: number
}): string | null {
  if (result.type === 'failure') {
    return result.data?.error ?? 'Invalid username or password'
  }
  if (result.type === 'redirect' || result.type === 'success') return null
  if (typeof result.message === 'string' && result.message.length > 0) {
    return result.message
  }
  return 'Unable to sign in. Please try again.'
}

function dismissLoginError() {
  errorDismissed = true
  clientError = null
}
</script>

<svelte:head>
  <title>Sign in — Wiki</title>
</svelte:head>

{#if loginError}
  <div
    class="fixed top-4 left-1/2 z-50 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2
           alert alert-error shadow-lg border border-error/30 py-3"
    role="alert"
    aria-live="assertive"
    id="login-error"
  >
    <AlertCircle size={18} class="shrink-0" aria-hidden="true" />
    <span class="flex-1 text-sm">{loginError}</span>
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square shrink-0"
      aria-label="Dismiss error"
      onclick={dismissLoginError}
    >
      <X size={14} />
    </button>
  </div>
{/if}

<div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-base-200 p-4">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div
        class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center shadow-lg mx-auto mb-4"
      >
        <BookOpen size={22} class="text-white" />
      </div>
      <h1 class="text-2xl font-bold text-base-content">Welcome back</h1>
      <p class="text-sm text-base-content/50 mt-1">Sign in to edit this wiki</p>
    </div>

    <!-- Card -->
    <div class="bg-base-100 rounded-2xl border border-base-200 shadow-lg p-6">
      <form
        method="POST"
        class="space-y-4"
        use:enhance={() => {
          pending = true
          clientError = null
          errorDismissed = false
          return async ({ result, update }) => {
            try {
              const message = loginErrorMessage(result)
              if (message) clientError = message
              await update({ reset: false })
            } finally {
              pending = false
            }
          }
        }}
      >
        <input type="hidden" name="next" value={data.next} />

        <div>
          <label
            for="username"
            class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            name="username"
            value={(form as { username?: string } | null)?.username ?? ''}
            autocomplete="username"
            required
            aria-invalid={loginError ? 'true' : undefined}
            class="w-full h-10 px-3 rounded-lg border border-base-300 bg-base-100
                   text-sm text-base-content placeholder:text-base-content/30
                   focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                   transition-all {loginError ? 'border-error/60' : ''}"
          />
        </div>

        <div>
          <label
            for="password"
            class="block text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1.5"
          >
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autocomplete="current-password"
              required
              aria-invalid={loginError ? 'true' : undefined}
              aria-describedby={loginError ? 'login-error' : undefined}
              class="w-full h-10 px-3 pr-10 rounded-lg border border-base-300 bg-base-100
                     text-sm text-base-content
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                     transition-all {loginError ? 'border-error/60' : ''}"
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
