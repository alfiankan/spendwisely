<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	// Flowbite init (if needed)
	let { children } = $props();
	let dropdownOpen = $state(false);
	let dropdownElement: HTMLElement;
	let isDarkMode = $state(false);
	
	onMount(async () => {
		// Initialize dark mode from localStorage
		if (typeof window !== 'undefined') {
			const savedTheme = localStorage.getItem('darkMode');
			isDarkMode = savedTheme === 'true';
			updateTheme();
		}

		// optional: Flowbite auto init if using data attributes
		// Dynamic import to avoid SSR issues
		if (typeof window !== 'undefined') {
			try {
				await import('flowbite');
			} catch (_) {}
		}
		
		// Add click outside listener
		function handleClickOutside(event: MouseEvent) {
			if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
				dropdownOpen = false;
			}
		}
		
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function toggleDarkMode() {
		isDarkMode = !isDarkMode;
		updateTheme();
		if (typeof window !== 'undefined') {
			localStorage.setItem('darkMode', isDarkMode.toString());
		}
	}

	function updateTheme() {
		if (typeof window !== 'undefined') {
			if (isDarkMode) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}
	
	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
</svelte:head>
<div class="min-h-screen bg-gray-50 dark:bg-slate-900">
  <nav class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
    <div class="max-w-screen-xl mx-auto p-4">
      <div class="flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
          <svg class="h-6 w-6 text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          SpendWisely
        </a>
        
        <!-- Right side controls -->
        <div class="flex items-center gap-2">
          <!-- Dark Mode Toggle -->
          <button 
            onclick={toggleDarkMode}
            class="p-2 text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {#if isDarkMode}
              <!-- Sun icon for light mode -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
              </svg>
            {:else}
              <!-- Moon icon for dark mode -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
              </svg>
            {/if}
          </button>
          
          <!-- Dropdown Menu -->
          <div class="relative" bind:this={dropdownElement}>
          <button 
            type="button" 
            class="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
            onclick={toggleDropdown}
          >
            <span class="font-medium">Menu</span>
            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
          </button>
          
          <!-- Dropdown Content -->
          <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-50" class:hidden={!dropdownOpen}>
            <div class="py-1">
              <a href="/new-expenses" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New Expense
              </a>
              <a href="/list-expenses" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                List Expenses
              </a>
              <a href="/settings" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Settings
              </a>
              <a href="/query-console" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Query Console
              </a>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-screen-xl mx-auto p-4">
    {@render children?.()}
  </main>
</div>
