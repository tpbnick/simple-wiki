<script lang="ts">
import {
  addChild,
  addParent,
  addSpouse,
  getPerson,
  linkParent,
  listLinkableParents,
  removePerson,
  updatePerson
} from '../lib/model.js'
import { personDisplayName } from '../lib/name.js'
import type { FamilyTreeData, FamilyTreePerson } from '../lib/types.js'
import { Upload, UserPlus, Baby, Trash2, ArrowUpFromLine } from 'lucide-svelte'

interface Props {
  data: FamilyTreeData
  personId: string
  onchange: (data: FamilyTreeData) => void
}

let { data, personId, onchange }: Props = $props()

let person = $derived(getPerson(data, personId))
let linkableParents = $derived(listLinkableParents(data, personId))
let uploading = $state(false)
let uploadError = $state('')
let fileInput = $state<HTMLInputElement | null>(null)

function patch(
  fields: Partial<Pick<FamilyTreePerson, 'name' | 'birthYear' | 'deathYear' | 'imageUrl'>>
) {
  onchange(updatePerson(data, personId, fields))
}

async function handleImageUpload(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploading = true
  uploadError = ''

  try {
    const formData = new FormData()
    formData.set('file', file)
    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!response.ok) throw new Error('Upload failed')
    const payload = await response.json()
    patch({ imageUrl: payload.url })
  } catch {
    uploadError = 'Could not upload image'
  } finally {
    uploading = false
  }
}
</script>

{#if person}
  <aside class="ft-editor">
    <p class="ft-editor__label">Selected person</p>
    <h2 class="ft-editor__title">{personDisplayName(person.name)}</h2>

    <label class="ft-field">
      <span>Name</span>
      <input
        type="text"
        value={person.name}
        placeholder="[[First Last]]"
        oninput={(e) => patch({ name: e.currentTarget.value })}
      />
      <span class="text-[0.7rem] text-base-content/45"
        >Use [[Page Name]] to link to a wiki page.</span
      >
    </label>

    <div class="ft-field-row">
      <label class="ft-field">
        <span>Birth year</span>
        <input
          type="text"
          inputmode="numeric"
          placeholder="e.g. 1842"
          value={person.birthYear ?? ''}
          oninput={(e) => patch({ birthYear: e.currentTarget.value })}
        />
      </label>
      <label class="ft-field">
        <span>Death year</span>
        <input
          type="text"
          inputmode="numeric"
          placeholder="e.g. 1910"
          value={person.deathYear ?? ''}
          oninput={(e) => patch({ deathYear: e.currentTarget.value })}
        />
      </label>
    </div>

    <div class="ft-field">
      <span>Photo</span>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={handleImageUpload}
      />
      <button
        type="button"
        class="btn btn-sm btn-outline w-full"
        disabled={uploading}
        onclick={() => fileInput?.click()}
      >
        <Upload size={14} />
        {uploading ? 'Uploading…' : person.imageUrl ? 'Change photo' : 'Add photo'}
      </button>
      {#if uploadError}
        <p class="text-xs text-error mt-1">{uploadError}</p>
      {/if}
    </div>

    {#if person.parentIds.length < 2}
      {#if person.parentIds.length === 0}
        <p class="ft-editor__notice">
          No parent is linked. Reconnect to someone already in the tree, or add a new parent.
        </p>
      {/if}
      {#if linkableParents.length > 0}
        <label class="ft-field">
          <span
            >{person.parentIds.length === 0 ? 'Reconnect to parent' : 'Link existing parent'}</span
          >
          <select
            class="select select-bordered select-sm w-full"
            value=""
            onchange={(event) => {
              const parentId = event.currentTarget.value
              if (!parentId) return
              onchange(linkParent(data, personId, parentId))
              event.currentTarget.value = ''
            }}
          >
            <option value="" disabled>Choose someone…</option>
            {#each linkableParents as candidate (candidate.id)}
              <option value={candidate.id}>{personDisplayName(candidate.name)}</option>
            {/each}
          </select>
        </label>
      {/if}
    {/if}

    <div class="ft-editor__actions">
      {#if person.parentIds.length < 2}
        <button
          type="button"
          class="btn btn-sm btn-outline"
          onclick={() => onchange(addParent(data, personId))}
        >
          <ArrowUpFromLine size={14} />
          Add parent
        </button>
      {/if}
      {#if !person.spouseId}
        <button
          type="button"
          class="btn btn-sm btn-outline"
          onclick={() => onchange(addSpouse(data, personId))}
        >
          <UserPlus size={14} />
          Add spouse
        </button>
      {/if}
      <button
        type="button"
        class="btn btn-sm btn-outline"
        onclick={() => onchange(addChild(data, personId))}
      >
        <Baby size={14} />
        Add child
      </button>
      {#if personId !== data.rootId}
        <button
          type="button"
          class="btn btn-sm btn-outline btn-error"
          onclick={() => onchange(removePerson(data, personId))}
        >
          <Trash2 size={14} />
          Remove
        </button>
      {/if}
    </div>
  </aside>
{/if}
