<script lang="ts">
  import { onMount } from 'svelte';
  import { execQuery } from '$lib/api';

  // Settings form
  let settings = $state({
    budget: 3500000,
    d1ProxyUrl: '',
    d1Token: ''
  });

  // Modal states
  let showResultModal = $state(false);
  let result = $state<{type: 'success' | 'error', message: string} | null>(null);
  let loading = $state(false);

  // Settings list
  let settingsList = $state<any[]>([]);

  async function loadSettings() {
    try {
      const data = await execQuery(`SELECT * FROM settings ORDER BY key`);
      settingsList = data.result?.[0]?.results || [];
      
      // Populate form with existing values
      const budgetSetting = settingsList.find(s => s.key === 'budget');
      
      if (budgetSetting) settings.budget = Number(budgetSetting.value);
      
      // Load D1 settings from localStorage (browser only)
      if (typeof window !== 'undefined') {
        settings.d1ProxyUrl = localStorage.getItem('d1_proxy_url') || '';
        settings.d1Token = localStorage.getItem('d1_token') || '';
      }
      
      // Add D1 settings to the display list (for UI purposes)
      if (settings.d1ProxyUrl) {
        settingsList.push({ key: 'd1_proxy_url', value: settings.d1ProxyUrl });
      }
      if (settings.d1Token) {
        settingsList.push({ key: 'd1_token', value: '••••••••' });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  onMount(loadSettings);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    
    try {
      // Update budget in SQLite
      await execQuery(
        `INSERT INTO settings (key, value) VALUES ('budget', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [settings.budget.toString()]
      );
      
      // Save D1 settings to localStorage (browser only)
      if (typeof window !== 'undefined') {
        if (settings.d1ProxyUrl.trim()) {
          localStorage.setItem('d1_proxy_url', settings.d1ProxyUrl.trim());
        } else {
          localStorage.removeItem('d1_proxy_url');
        }
        
        if (settings.d1Token.trim()) {
          localStorage.setItem('d1_token', settings.d1Token.trim());
        } else {
          localStorage.removeItem('d1_token');
        }
      }
      
      result = {
        type: 'success',
        message: 'Settings have been saved successfully!'
      };
      
      // Reload settings list
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      result = {
        type: 'error',
        message: 'Failed to save settings. Please try again.'
      };
    }
    
    loading = false;
    showResultModal = true;
  }

  function closeModal() {
    showResultModal = false;
    result = null;
  }

  function formatKey(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>


<!-- Current Settings List -->
<div class="mb-8">
  <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Settings</h2>
  <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
    <table class="w-full text-sm text-left">
      <thead class="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700">
        <tr>
          <th class="px-4 py-3">Key</th>
          <th class="px-4 py-3">Value</th>
        </tr>
      </thead>
      <tbody>
        {#each settingsList as setting}
          <tr class="border-t border-gray-200 dark:border-slate-600">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{formatKey(setting.key)}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-slate-100">
              {#if setting.key === 'd1_token'}
                <span class="text-gray-500 dark:text-slate-400">••••••••</span>
              {:else}
                {setting.value}
              {/if}
            </td>
          </tr>
        {/each}
        {#if settingsList.length === 0}
          <tr>
            <td colspan="2" class="px-4 py-8 text-center text-gray-500 dark:text-slate-400">No settings found</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Settings Form -->
<div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
  <h3 class="text-lg font-medium mb-6 text-gray-900 dark:text-white">Update Settings</h3>
  
  <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Budget (Rp)</label>
        <input 
          type="number" 
          bind:value={settings.budget} 
          class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
          placeholder="Enter budget amount"
          required 
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Set your monthly budget limit</p>
      </div>
      
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">D1 Proxy URL</label>
        <input 
          type="url" 
          bind:value={settings.d1ProxyUrl} 
          class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
          placeholder="https://your-d1-proxy.com"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">D1 database proxy endpoint</p>
      </div>
    </div>
    
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">D1 Token</label>
      <input 
        type="password" 
        bind:value={settings.d1Token} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        placeholder="Enter D1 authentication token"
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Authentication token for D1 database access</p>
    </div>
    
    <div class="flex justify-end">
      <button 
        type="submit" 
        class="text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
</div>

<!-- Result Modal -->
{#if showResultModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        {#if result?.type === 'success'}
          <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {:else}
          <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {/if}
        <h3 class="text-lg font-semibold text-gray-900">
          {result?.type === 'success' ? 'Success' : 'Error'}
        </h3>
      </div>
      
      <p class="text-gray-600 mb-6">
        {result?.message}
      </p>
      
      <div class="flex justify-end">
        <button 
          class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          onclick={closeModal}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}


