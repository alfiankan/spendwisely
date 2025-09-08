<script lang="ts">
  import { onMount } from 'svelte';
  import { ExpensePresenter } from '$lib/presenters/ExpensePresenter';
  import type { Expense, ModalResult } from '$lib/types';
  import { CATEGORIES, LABELS } from '$lib/types';

  // Presenter instance
  let presenter: ExpensePresenter;

  // Form state
  let form = $state({
    title: "",
    note: "",
    amount: "",
    datetime: "",
    labels: "FOOD & BEVERAGE",
    category: "BASIC NEEDS",
  });

  // UI state
  let showResultModal = $state(false);
  let result = $state<ModalResult | null>(null);
  let loading = $state(false);
  let error = $state('');

  // File upload state
  let files: FileList | null = null;
  let selectedFiles = $state<File[]>([]);
  let uploadingFiles = $state(false);

  // Initialize presenter and set up state setters
  onMount(() => {
    presenter = new ExpensePresenter();
    
    // Inject state setters into presenter
    presenter.setSelectedFiles = (files: File[]) => {
      selectedFiles = files;
    };
    
    presenter.setUploadingFiles = (uploading: boolean) => {
      uploadingFiles = uploading;
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

    // Set default datetime to now
    const now = new Date();
    form.datetime = now.toISOString().slice(0, 16);
  });

  // File handling functions
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const newFiles = Array.from(target.files);
      
      // Validate file sizes using presenter
      const validFiles = newFiles.filter(file => {
        if (!presenter.validateFileSize(file)) {
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });
      
      selectedFiles = [...selectedFiles, ...validFiles];
    }
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
  }

  // Form submission
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    
    // Validate form data using presenter
    const expenseData: Partial<Expense> = {
      title: form.title,
      note: form.note,
      amount: Number(form.amount),
      datetime: form.datetime,
      labels: form.labels,
      category: form.category,
    };

    const validationErrors = presenter.validateExpenseData(expenseData);
    if (validationErrors.length > 0) {
      error = validationErrors.join(', ');
      return;
    }

    // Clear previous errors
    error = '';

    // Create expense using presenter
    await presenter.createExpense(expenseData as Omit<Expense, 'id' | 'attachments'>, selectedFiles);

    // Clear form after successful submission
    if (result?.type === 'success') {
      form = {
        title: "",
        note: "",
        amount: "",
        datetime: new Date().toISOString().slice(0, 16),
        labels: "FOOD & BEVERAGE",
        category: "BASIC NEEDS",
      };
      selectedFiles = [];
      files = null;
      
      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  function closeModal() {
    showResultModal = false;
    result = null;
  }
</script>

<div class="max-w-2xl mx-auto p-6">
  <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">New Expense</h2>
  
  {#if error}
    <div class="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
      {error}
    </div>
  {/if}

  <form class="max-w-lg space-y-4" onsubmit={(e) => handleSubmit(e)}>
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Title</label>
      <input 
        type="text" 
        bind:value={form.title} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        placeholder="Enter expense title"
        required 
      />
    </div>

    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Note</label>
      <textarea 
        bind:value={form.note} 
        rows="3" 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        placeholder="Enter expense note"
      ></textarea>
    </div>

    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Amount (Rp)</label>
      <input 
        type="number" 
        bind:value={form.amount} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        placeholder="Enter amount"
        min="0"
        step="100"
        required 
      />
    </div>

    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Date & Time</label>
      <input 
        type="datetime-local" 
        bind:value={form.datetime} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
        required 
      />
    </div>

    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Labels</label>
      <select 
        bind:value={form.labels} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5"
        required
      >
        {#each LABELS as label}
          <option value={label}>{label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Category</label>
      <select 
        bind:value={form.category} 
        class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5"
        required
      >
        {#each CATEGORIES as category}
          <option value={category}>{category}</option>
        {/each}
      </select>
    </div>

    <!-- File Upload Section -->
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Attachments (Optional)</label>
      <div class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-slate-500 transition-colors">
        <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="mt-4">
          <label for="file-upload" class="cursor-pointer">
            <span class="mt-2 block text-sm font-medium text-gray-900 dark:text-slate-100">
              Click to upload files or drag and drop
            </span>
            <span class="mt-1 block text-xs text-gray-500 dark:text-slate-400">
              PNG, JPG, PDF up to 10MB each
            </span>
          </label>
          <input 
            type="file" 
            bind:files
            onchange={handleFileChange}
            multiple
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
            class="hidden"
            id="file-upload"
          />
        </div>
      </div>
      
      <!-- Selected Files Display -->
      {#if selectedFiles.length > 0}
        <div class="mt-4 space-y-2">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-200">Selected Files:</h4>
          {#each selectedFiles as file, index}
            <div class="flex items-center justify-between bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 dark:text-slate-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-slate-100">{file.name}</p>
                  <p class="text-xs text-gray-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                type="button"
                onclick={() => removeFile(index)}
                class="text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-700 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-600 font-medium rounded-lg text-sm p-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <button 
      type="submit" 
      class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      disabled={loading}
    >
      {#if uploadingFiles}
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading files...
      {:else if loading}
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating Expense...
      {:else}
        Create Expense
      {/if}
    </button>
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