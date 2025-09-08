<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect to new-expenses page immediately
    goto('/new-expenses');
  });
</script>

<!-- Loading state while redirecting -->
<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
    <p class="text-gray-600 dark:text-slate-400">Redirecting to New Expense...</p>
  </div>
</div>
