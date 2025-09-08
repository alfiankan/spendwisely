<script lang="ts">
  import { onMount } from 'svelte';
  import { execQuery } from '$lib/api';

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
  const today = new Date();
  const startDateDefault = new Date(today.getFullYear(), today.getMonth() - 1, 25);
  const endDateDefault = new Date(today.getFullYear(), today.getMonth(), 25);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  let expenses = $state<any[]>([]);
  let BUDGET = $state(0);
  let loading = $state(false);
  let error = $state('');
  let filters = $state({
    label: '',
    category: '',
    startDate: formatDate(startDateDefault),
    endDate: formatDate(endDateDefault),
    sortBy: 'datetime',
    sortOrder: 'desc'
  });

  // Modal states
  let showConfirmModal = $state(false);
  let showResultModal = $state(false);
  let expenseToDelete = $state<any>(null);
  let deleteResult = $state<{type: 'success' | 'error', message: string} | null>(null);
  let isDeleting = $state(false);

  const categories = ["BASIC NEEDS", "TERSIER", "EMERGENCY"];
  const labels = ["FOOD & BEVERAGE", "GROCERIES", "TRANSPORT", "ENTERTAIMENT", "HEALTH", "OTHER", "LIVING", "EMERGENCY", "SELF DEV", "SOCIAL"];

  async function fetchBudget() {
    try {
      const data = await execQuery(`SELECT value FROM settings WHERE key = 'budget'`);
      const budget = data.result?.[0]?.results?.[0]?.value;
      BUDGET = budget ? Number(budget) : 0;
      console.log('Budget loaded:', BUDGET);
    } catch (error) {
      console.error('Error fetching budget:', error);
      BUDGET = 0; // Set default value if database fetch fails
    }
  }

  async function fetchExpenses() {
    loading = true;
    error = '';
    try {
      let sql = `SELECT * FROM expenses WHERE date(datetime) BETWEEN DATE(?) AND DATE(?)`;
      const params: any[] = [filters.startDate, filters.endDate];
      if (filters.label) { sql += ` AND labels = ?`; params.push(filters.label); }
      if (filters.category) { sql += ` AND category = ?`; params.push(filters.category); }
      sql += ` ORDER BY ${filters.sortBy} ${filters.sortOrder.toUpperCase()}`;
      
      console.log('Fetching expenses with SQL:', sql, 'Params:', params);
      const data = await execQuery(sql, params);
      console.log('API Response:', data);
      
      expenses = data.result?.[0]?.results || [];
      console.log('Expenses loaded:', expenses.length, 'items');
    } catch (err) {
      console.error('Error fetching expenses:', err);
      error = 'Failed to load expenses. Please check console for details.';
      expenses = [];
    } finally {
      loading = false;
    }
  }

  async function loadAll() {
    await fetchBudget();
    await fetchExpenses();
  }

  onMount(loadAll);

  // Track previous filter values to avoid infinite loops
  let prevFilters = { ...filters };
  
  $effect(() => {
    // Only reload if filters actually changed
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(prevFilters);
    if (filtersChanged) {
      prevFilters = { ...filters };
      fetchExpenses();
    }
  });

  const totalSpent = $derived(expenses.reduce((sum, e) => sum + Number(e.amount), 0));
  const remaining = $derived(BUDGET - totalSpent);
  const percentageUsed = $derived(Math.min((totalSpent / BUDGET) * 100, 100).toFixed(1));

  function confirmDelete(expense: any) {
    expenseToDelete = expense;
    showConfirmModal = true;
  }

  async function deleteExpense() {
    if (!expenseToDelete) return;
    
    isDeleting = true;
    try {
      await execQuery(`DELETE FROM expenses WHERE id = ?`, [expenseToDelete.id]);
      await fetchExpenses();
      
      deleteResult = {
        type: 'success',
        message: `Expense "${expenseToDelete.title}" has been deleted successfully.`
      };
    } catch (error) {
      console.error('Error deleting expense:', error);
      deleteResult = {
        type: 'error',
        message: 'Failed to delete expense. Please try again.'
      };
    } finally {
      isDeleting = false;
    }
    
    showConfirmModal = false;
    showResultModal = true;
    expenseToDelete = null;
  }

  function closeModals() {
    showConfirmModal = false;
    showResultModal = false;
    deleteResult = null;
    expenseToDelete = null;
  }
</script>

<div class="flex justify-between items-center mb-4">
  <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Expenses</h2>
  <button 
    class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-5 py-2.5"
    onclick={loadAll}
    disabled={loading}
  >
    {loading ? 'Loading...' : 'Refresh'}
  </button>
</div>

{#if error}
  <div class="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
    {error}
  </div>
{/if}

{#if loading}
  <div class="mb-4 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded">
    Loading expenses...
  </div>
{/if}

<div class="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Total Spent</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(totalSpent)}</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Budget</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(BUDGET)}</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Remaining</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(remaining)}</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Used</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{percentageUsed}%</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Avg Spent</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(expenses.length ? totalSpent/expenses.length : 0)}</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Max Spent</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(expenses.length ? Math.max(...expenses.map(e => Number(e.amount))) : 0)}</div>
  </div>
  <div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
    <div class="text-sm text-gray-500 dark:text-slate-400">Min Spent</div>
    <div class="text-xl font-semibold text-gray-900 dark:text-slate-100">{formatRupiah(expenses.length ? Math.min(...expenses.map(e => Number(e.amount))) : 0)}</div>
  </div>
</div>

<div class="flex flex-wrap gap-2 mb-4">
  <select bind:value={filters.label} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5">
    <option value="">All Labels</option>
    {#each labels as l}
      <option value={l}>{l}</option>
    {/each}
  </select>
  <select bind:value={filters.category} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5">
    <option value="">All Categories</option>
    {#each categories as c}
      <option value={c}>{c}</option>
    {/each}
  </select>
  <input type="date" bind:value={filters.startDate} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5" />
  <input type="date" bind:value={filters.endDate} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5" />
  <select bind:value={filters.sortBy} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5">
    <option value="datetime">Sort by Date</option>
    <option value="amount">Sort by Amount</option>
  </select>
  <select bind:value={filters.sortOrder} class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg p-2.5">
    <option value="asc">Ascending</option>
    <option value="desc">Descending</option>
  </select>
</div>

<div class="overflow-auto max-h-[500px] border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
  <table class="w-full text-sm text-left">
    <thead class="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
      <tr>
        {#each ["ID","Title","Note","Amount","Datetime","Labels","Category","Attachments","Actions"] as h}
          <th class="px-4 py-2">{h}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each expenses as row}
        <tr class="border-t border-gray-200 dark:border-slate-600">
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.id}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.title}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.note}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{formatRupiah(row.amount)}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.datetime}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.labels}</td>
          <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row.category}</td>
          <td class="px-4 py-2">
            {#if row.attachments}
              {@const attachments = JSON.parse(row.attachments)}
              {#if attachments.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each attachments as attachment, index}
                    <a 
                      href={attachment} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40"
                    >
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                      </svg>
                      File {index + 1}
                    </a>
                  {/each}
                </div>
              {:else}
                <span class="text-gray-400 dark:text-slate-500 text-xs">No files</span>
              {/if}
            {:else}
              <span class="text-gray-400 dark:text-slate-500 text-xs">No files</span>
            {/if}
          </td>
          <td class="px-4 py-2">
            <button class="text-white bg-red-600 hover:bg-red-700 rounded px-3 py-1" onclick={() => confirmDelete(row)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if expenses.length === 0}
    <div class="p-4 text-center text-gray-500">No data</div>
  {/if}
</div>

<!-- Confirmation Modal -->
{#if showConfirmModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
        Are you sure you want to delete the expense <strong>"{expenseToDelete?.title}"</strong>? 
        This action cannot be undone.
      </p>
      
      <div class="flex justify-end space-x-3">
        <button 
          class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={closeModals}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          onclick={deleteExpense}
          disabled={isDeleting}
        >
          {#if isDeleting}
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Deleting...
          {:else}
            Delete
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Result Modal -->
{#if showResultModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        {#if deleteResult?.type === 'success'}
          <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {:else}
          <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {/if}
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {deleteResult?.type === 'success' ? 'Success' : 'Error'}
        </h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
        {deleteResult?.message}
      </p>
      
      <div class="flex justify-end">
        <button 
          class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          onclick={closeModals}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}


