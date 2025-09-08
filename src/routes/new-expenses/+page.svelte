<script lang="ts">
  import { execQuery, uploadFile } from "$lib/api";

  let form = {
    title: "",
    note: "",
    amount: "",
    datetime: "",
    labels: "FOOD & BEVERAGE",
    category: "BASIC NEEDS",
  };

  // Modal states
  let showResultModal = $state(false);
  let result = $state<{type: 'success' | 'error', message: string} | null>(null);
  let loading = $state(false);

  // File upload states
  let files: FileList | null = null;
  let selectedFiles = $state<File[]>([]);
  let uploadingFiles = $state(false);

  const categories = ["BASIC NEEDS", "TERSIER", "EMERGENCY"];
  const labels = ["FOOD & BEVERAGE", "GROCERIES", "TRANSPORT", "ENTERTAIMENT", "HEALTH", "OTHER", "LIVING", "EMERGENCY", "SELF DEV", "SOCIAL"];

  // File handling functions
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const newFiles = Array.from(target.files);
      
      // Validate file sizes (max 10MB each)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
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

  async function uploadFileToR2(file: File): Promise<string> {
    try {
      const result = await uploadFile(file);
      return result.url;
    } catch (error) {
      throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    uploadingFiles = true;
    
    try {
      // Upload files to R2 if any
      let attachmentUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadFileToR2(file);
          attachmentUrls.push(url);
        }
      }
      
      // Insert expense with attachments
      const sql = `INSERT INTO expenses (title, note, amount, datetime, labels, category, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const params = [
        form.title, 
        form.note, 
        Number(form.amount), 
        form.datetime, 
        form.labels, 
        form.category,
        JSON.stringify(attachmentUrls)
      ];
      
      await execQuery(sql, params);
      
      result = {
        type: 'success',
        message: `Expense has been added successfully!${selectedFiles.length > 0 ? ` ${selectedFiles.length} file(s) uploaded.` : ''}`
      };
      
      // Show success message briefly, then refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      result = {
        type: 'error',
        message: `Failed to add expense: ${errorMessage}`
      };
    }
    
    loading = false;
    uploadingFiles = false;
    showResultModal = true;
  }

  function closeModal() {
    showResultModal = false;
    result = null;
  }
</script>

<h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">New Expense</h2>
  <form class="max-w-lg space-y-4" onsubmit={(e) => handleSubmit(e)}>
  <div>
    <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Title</label>
    <input class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" bind:value={form.title} name="title" placeholder="Title" required />
  </div>
  <div>
    <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Note</label>
    <textarea class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5 min-h-24" bind:value={form.note} name="note" placeholder="Note"></textarea>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Amount</label>
      <input type="number" class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" bind:value={form.amount} name="amount" placeholder="Amount" required />
    </div>
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Datetime</label>
      <input type="datetime-local" class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" bind:value={form.datetime} name="datetime" required />
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Label</label>
      <select class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" bind:value={form.labels} name="labels">
        {#each labels as label}
          <option value={label}>{label}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Category</label>
      <select class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" bind:value={form.category} name="category">
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <!-- File Upload Section -->
  <div>
    <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Attachments (Optional)</label>
    <div class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-slate-500 transition-colors">
      <input 
        type="file" 
        bind:files
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        class="hidden"
        id="file-upload"
        onchange={handleFileChange}
      />
      <label for="file-upload" class="cursor-pointer">
        <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="mt-2">
          <p class="text-sm text-gray-600 dark:text-slate-400">
            <span class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Click to upload</span>
            or drag and drop
          </p>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-1">
            Images, PDF, DOC, DOCX, TXT (Max 10MB each)
          </p>
        </div>
      </label>
    </div>
    
    <!-- Selected Files Display -->
    {#if selectedFiles.length > 0}
      <div class="mt-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Selected Files:</h4>
        <div class="space-y-2">
          {#each selectedFiles as file, index}
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded border">
              <div class="flex items-center">
                <svg class="h-5 w-5 text-gray-400 dark:text-slate-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="text-sm text-gray-900 dark:text-slate-100">{file.name}</span>
                <span class="text-xs text-gray-500 dark:text-slate-400 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button 
                type="button"
                onclick={() => removeFile(index)}
                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  <button 
    type="submit" 
    class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
    disabled={loading}
  >
    {#if loading}
      {#if uploadingFiles && selectedFiles.length > 0}
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading files...
      {:else}
        Adding...
      {/if}
    {:else}
      Add Expense
    {/if}
  </button>
</form>

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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {result?.type === 'success' ? 'Success' : 'Error'}
        </h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
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


