<script lang="ts">
import { ArrowLeft } from 'lucide-svelte'
import { extensionsAdminUrl } from '$lib/extensions/admin-url.js'
</script>

<a
  href={extensionsAdminUrl()}
  class="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/70
         hover:text-base-content transition-colors"
>
  <ArrowLeft size={14} aria-hidden="true" />
  Back to extensions
</a>
