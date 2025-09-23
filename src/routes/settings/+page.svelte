<script lang="ts">
  import { onMount } from 'svelte';
  import { SettingsPresenter } from '$lib/presenters/SettingsPresenter';
  import type { Settings, SettingItem, ModalResult } from '$lib/types';

  // Presenter instance
  let presenter: SettingsPresenter;

  // State
  let settings = $state<Settings>({
    budget: 3500000,
    tursoHost: 'https://alfifinance-alfiankan.aws-ap-northeast-1.turso.io',
    tursoToken: ''
  });

  let settingsList = $state<SettingItem[]>([]);
  let loading = $state(false);
  let error = $state('');

  // Modal states
  let showResultModal = $state(false);
  let result = $state<ModalResult | null>(null);

  // Initialize presenter and set up state setters
  onMount(() => {
    presenter = new SettingsPresenter();
    
    // Inject state setters into presenter
    presenter.setSettings = (settingsData: Settings) => {
      settings = settingsData;
    };
    
    presenter.setSettingsList = (list: SettingItem[]) => {
      settingsList = list;
    };
    
    presenter.showModal = (modalResult: ModalResult) => {
      result = modalResult;
      showResultModal = true;
    };
    
    presenter.setLoading = (isLoading: boolean) => {
      loading = isLoading;
    };
    
    presenter.setError = (errorMessage: string) => {
      error = errorMessage;
    };

    // Load initial settings
    loadSettings();
  });

  async function loadSettings() {
    await presenter.loadSettings();
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    
    // Validate settings using presenter
    const validationErrors = presenter.validateSettings(settings);
    if (validationErrors.length > 0) {
      error = validationErrors.join(', ');
      return;
    }

    // Clear previous errors
    error = '';

    // Save settings using presenter
    await presenter.saveSettings(settings);
  }

  function closeModal() {
    showResultModal = false;
    result = null;
  }

  function formatKey(key: string): string {
    return presenter.formatKey(key);
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
              {#if setting.key === 'turso_token'}
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
  
  <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <div class="flex items-start">
      <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Turso Configuration</h4>
        <p class="text-sm text-blue-700 dark:text-blue-300">
          Configure your Turso database connection. You can find your database URL and token in your Turso dashboard.
        </p>
      </div>
    </div>
  </div>
  
  {#if error}
    <div class="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
      {error}
    </div>
  {/if}
  
  <form class="space-y-6" onsubmit={(e) => handleSubmit(e)}>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="budget" class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Budget (Rp)</label>
        <input 
          id="budget"
          type="number" 
          bind:value={settings.budget} 
          class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
          placeholder="Enter budget amount"
          min="0"
          step="1000"
          required 
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Set your monthly budget limit</p>
      </div>
      
      <div>
        <label for="turso-host" class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Turso Host</label>
        <input 
          id="turso-host"
          type="url" 
          bind:value={settings.tursoHost} 
          class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
          placeholder="https://your-database.turso.io"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Turso database host URL</p>
      </div>
    </div>
    
    <div>
      <label for="turso-token" class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Turso Token</label>
      <input 
        id="turso-token"
        type="password" 
        bind:value={settings.tursoToken} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        placeholder="Enter Turso authentication token"
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Authentication token for Turso database access</p>
    </div>
    
    <div class="flex justify-end">
      <button 
        type="submit" 
        class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {result?.type === 'success' ? 'Success' : 'Error'}
        </h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
        {result?.message}
      </p>
      
      <div class="flex justify-end">
        <button 
          class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-4 py-2"
          onclick={closeModal}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}