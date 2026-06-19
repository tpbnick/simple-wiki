<script lang="ts">
import { enhance } from '$app/forms'
import { Puzzle } from 'lucide-svelte'
import type { ActionData } from './$types'

let {
  extensions,
  form
}: {
  extensions: Array<{
    id: string
    name: string
    version: string
    description?: string
    manageHref?: string | null
    enabled: boolean
  }>
  form: ActionData
} = $props()
</script>

{#if extensions.length === 0}
  <div class="text-center py-16">
    <div class="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center mx-auto mb-4">
      <Puzzle size={22} class="text-base-content/30" />
    </div>
    <p class="text-base-content/50 text-sm font-medium mb-1">No extensions loaded</p>
    <p class="text-base-content/35 text-xs">
      Add an extension as <code class="font-mono bg-base-200 px-1 rounded"
        >extensions/&lt;name&gt;/index.ts</code
      > in the repo, then restart the server.
    </p>
  </div>
{:else}
  {#if form && 'extensionError' in form && form.tab === 'extensions'}
    <p class="text-error text-sm mb-4" role="alert">{form.extensionError}</p>
  {/if}

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each extensions as ext (ext.id)}
      <div
        class="bg-base-100 border border-wiki-border rounded-[var(--radius-box)] shadow-[var(--shadow-sm)] p-4
               {ext.enabled ? '' : 'opacity-70'}"
      >
        <div class="flex items-start justify-between gap-3 mb-1">
          <div class="min-w-0">
            <p class="font-semibold text-sm text-base-content">{ext.name}</p>
            <span class="text-xs text-base-content/40 font-mono">v{ext.version}</span>
          </div>

          <form
            method="POST"
            action="?/toggleExtension"
            use:enhance={() => {
              return async ({ update }) => {
                await update({ invalidateAll: true })
              }
            }}
            class="shrink-0"
          >
            <input type="hidden" name="extensionId" value={ext.id} />
            <label class="inline-flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                class="peer sr-only"
                checked={ext.enabled}
                aria-label="{ext.enabled ? 'Disable' : 'Enable'} {ext.name}"
                onchange={(event) => {
                  event.currentTarget.form?.requestSubmit()
                }}
              />
              <span
                class="relative h-6 w-11 rounded-full bg-base-300 transition-colors duration-200
                       peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2
                       peer-focus-visible:outline-primary peer-checked:bg-primary
                       after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full
                       after:bg-white after:shadow-sm after:transition-transform after:duration-200
                       after:content-[''] peer-checked:after:translate-x-5"
              ></span>
              <span class="text-xs font-medium text-base-content/60 select-none">
                {ext.enabled ? 'On' : 'Off'}
              </span>
            </label>
          </form>
        </div>

        {#if ext.description}
          <p class="text-xs text-base-content/55 mt-2">{ext.description}</p>
        {/if}

        {#if !ext.enabled}
          <p class="text-xs text-base-content/45 mt-2">Disabled — hooks and routes are inactive.</p>
        {/if}

        {#if ext.manageHref}
          <a
            href={ext.manageHref}
            class="inline-block text-xs text-primary/70 mt-3 font-medium hover:text-primary transition-colors
                   {ext.enabled ? '' : 'pointer-events-none opacity-50'}"
            aria-disabled={!ext.enabled}
            tabindex={ext.enabled ? 0 : -1}
          >
            Open →
          </a>
        {/if}
      </div>
    {/each}
  </div>
{/if}
