<script lang="ts">
  import { onMount } from 'svelte';
  // Dynamic import for better compatibility
  let Tesseract: any = null;

  // State
  let selectedFile = $state<File | null>(null);
  let isProcessing = $state(false);
  let progress = $state(0);
  let recognizedText = $state('');
  let error = $state('');
  let previewUrl = $state<string | null>(null);
  let processingStatus = $state('');
  let isDragOver = $state(false);
  let parsedTransactions = $state<Array<{date: string, description: string, amount: string, type: string}>>([]);
  let showJSONPreview = $state(true);

  // File handling
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    processFile(file);
  }

  // Process dropped or selected file
  function processFile(file: File | null | undefined) {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file (JPG, PNG, GIF, etc.)';
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      error = 'File size must be less than 10MB';
      return;
    }
    
    selectedFile = file;
    error = '';
    recognizedText = '';
    
    // Create preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(file);
  }

  // Drag and drop handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  // OCR processing
  async function processImage() {
    if (!selectedFile) return;
    
    isProcessing = true;
    progress = 0;
    recognizedText = '';
    error = '';
    processingStatus = 'Loading OCR engine...';
    
    try {
      // Dynamic import of Tesseract.js
      if (!Tesseract) {
        processingStatus = 'Loading Tesseract.js...';
        progress = 10;
        Tesseract = await import('tesseract.js');
      }
      
      processingStatus = 'Initializing OCR worker...';
      progress = 20;
      
      const worker = await Tesseract.createWorker('eng');
      
      processingStatus = 'Processing image...';
      progress = 50;
      
      const { data: { text } } = await worker.recognize(selectedFile);
      
      console.log("OCR OUTPUT", text)

      progress = 100;
      recognizedText = text;
      processingStatus = 'OCR completed successfully!';
      
      // Parse transactions from the recognized text
      parsedTransactions = parseTransactions(text);
      
      await worker.terminate();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred during OCR processing';
      processingStatus = '';
      console.error('OCR Error:', err);
    } finally {
      isProcessing = false;
    }
  }

  // Generate JSON preview
  function generateJSONPreview() {
    const jsonData = parsedTransactions.map(transaction => {
      let isoDate = transaction.date;
      try {
        const dateObj = new Date(transaction.date);
        if (!isNaN(dateObj.getTime())) {
          isoDate = dateObj.toISOString();
        }
      } catch (e) {
        isoDate = transaction.date;
      }
      
      const amountMatch = transaction.amount.match(/[\d,]+\.?\d*/);
      const numericAmount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
      
      return {
        date: isoDate,
        desc: transaction.description,
        amount: numericAmount
      };
    });
    
    return JSON.stringify(jsonData, null, 2);
  }

  // Clear all data
  function clearAll() {
    selectedFile = null;
    recognizedText = '';
    error = '';
    progress = 0;
    processingStatus = '';
    parsedTransactions = [];
    showJSONPreview = false;
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    
    // Clear file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Copy text to clipboard
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(recognizedText);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  // Download text as file
  function downloadText() {
    const blob = new Blob([recognizedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-result-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Parse transactions from OCR text
  function parseTransactions(text: string) {
    console.log(text)
    const transactions: Array<{date: string, description: string, amount: string, type: string}> = [];
    
    // Split text into lines and clean them
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Reconstruct fragmented lines by joining related content
    const reconstructedLines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(line);
      
      // Check if this line contains an amount (end of transaction)
      const amountMatch = line.match(/IDR\s*([\d,]+\.?\d*)/i);
      
      if (amountMatch) {
        // This line contains an amount, so it's the end of a transaction
        currentLine += ' ' + line;
        reconstructedLines.push(currentLine.trim());
        currentLine = '';
      } else {
        // This line is part of a transaction, add it to current line
        currentLine += ' ' + line;
      }
    }
    
    // Process each reconstructed transaction line
    for (const line of reconstructedLines) {
      console.log(line);
      const transaction: any = { date: '', description: '', amount: '', type: '' };
      
      // Extract date (look for patterns like "09 Sep 2025" or "Sep 2025")
      const dateMatch = line.match(/(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
      if (dateMatch) {
        transaction.date = dateMatch[1];
      }
      
      // Extract amount (IDR with numbers and commas)
      const amountMatch = line.match(/IDR\s*([\d,]+\.?\d*)/i);
      if (amountMatch) {
        transaction.amount = `IDR ${amountMatch[1]}`;
      }
      
      // Extract transaction type
      const typeMatch = line.match(/(TRSF E-BANKING CR|TRANSAKSI DEBIT|TRANSFER|CREDIT|DEBIT)/i);
      if (typeMatch) {
        transaction.type = typeMatch[1];
      }
      
      // The description is the entire line minus the extracted parts
      let description = line;
      
      // Remove date from description
      if (dateMatch) {
        description = description.replace(dateMatch[0], '').trim();
      }
      
      // Remove amount from description
      if (amountMatch) {
        description = description.replace(amountMatch[0], '').trim();
      }
      
      // Remove transaction type from description
      if (typeMatch) {
        description = description.replace(typeMatch[0], '').trim();
      }
      
      // Clean up extra spaces and common OCR artifacts
      description = description
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/[|]/g, '')   // Remove pipe characters
        .replace(/^\d+\s+/, '') // Remove leading numbers
        .trim();
      
      transaction.description = description;
      
      // Only add transaction if we have essential data
      if (transaction.date && transaction.amount) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  // Export transactions as CSV
  function exportTransactions() {
    if (parsedTransactions.length === 0) return;
    
    const headers = ['Date', 'Description', 'Type', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...parsedTransactions.map(t => [
        `"${t.date}"`,
        `"${t.description}"`,
        `"${t.type}"`,
        `"${t.amount}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export transactions as JSON
  function exportTransactionsJSON() {
    if (parsedTransactions.length === 0) return;
    
    // Convert to the requested format: [{"date": "isodate", "desc": "raw line of ocr", "amount": 1000}]
    const jsonData = parsedTransactions.map(transaction => {
      // Convert date to ISO format
      let isoDate = transaction.date;
      try {
        // Try to parse the date and convert to ISO
        const dateObj = new Date(transaction.date);
        if (!isNaN(dateObj.getTime())) {
          isoDate = dateObj.toISOString();
        }
      } catch (e) {
        // Keep original date if parsing fails
        isoDate = transaction.date;
      }
      
      // Extract numeric amount (remove IDR and commas)
      const amountMatch = transaction.amount.match(/[\d,]+\.?\d*/);
      const numericAmount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
      
      return {
        date: isoDate,
        desc: transaction.description,
        amount: numericAmount
      };
    });
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Copy JSON to clipboard
  async function copyJSONToClipboard() {
    if (parsedTransactions.length === 0) return;
    
    const jsonData = parsedTransactions.map(transaction => {
      let isoDate = transaction.date;
      try {
        const dateObj = new Date(transaction.date);
        if (!isNaN(dateObj.getTime())) {
          isoDate = dateObj.toISOString();
        }
      } catch (e) {
        isoDate = transaction.date;
      }
      
      const amountMatch = transaction.amount.match(/[\d,]+\.?\d*/);
      const numericAmount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
      
      return {
        date: isoDate,
        desc: transaction.description,
        amount: numericAmount
      };
    });
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    
    try {
      await navigator.clipboard.writeText(jsonContent);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  }

  // Cleanup on component destroy
  onMount(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  });
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">OCR Text Recognition</h1>
    <p class="text-gray-600 dark:text-slate-400">
      Upload an image to extract text using optical character recognition (OCR)
    </p>
    {#if error && error.includes('tesseract')}
      <div class="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 rounded">
        <p class="text-sm">
          <strong>Note:</strong> OCR functionality requires the Tesseract.js library to be loaded. 
          If you're seeing this error, please refresh the page and try again.
        </p>
      </div>
    {/if}
  </div>

  <!-- File Upload Section -->
  <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6 mb-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload Image</h2>
    
    {#if error}
      <div class="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
        {error}
      </div>
    {/if}

    <div 
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragOver ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'}"
      role="button"
      tabindex="0"
      aria-label="Upload image file by clicking or dragging and dropping"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
    >
      <svg class="mx-auto h-16 w-16 mb-4 transition-colors {isDragOver ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      
      <div class="mb-4">
        <label for="file-input" class="cursor-pointer">
          <span class="text-lg font-medium transition-colors {isDragOver ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-slate-100'}">
            {isDragOver ? 'Drop image here' : 'Click to upload image or drag and drop'}
          </span>
          <span class="block text-sm text-gray-500 dark:text-slate-400 mt-1">
            PNG, JPG, GIF up to 10MB
          </span>
        </label>
        <input 
          id="file-input"
          type="file" 
          accept="image/*"
          onchange={handleFileSelect}
          class="hidden"
          disabled={isProcessing}
        />
      </div>
    </div>

    {#if selectedFile}
      <div class="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-8 h-8 text-gray-400 dark:text-slate-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedFile.name}</p>
              <p class="text-xs text-gray-500 dark:text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onclick={clearAll}
            class="text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-700 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-600 font-medium rounded-lg text-sm px-3 py-1"
            disabled={isProcessing}
          >
            Remove
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Image Preview -->
  {#if previewUrl}
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Image Preview</h2>
      <div class="flex justify-center">
        <img 
          src={previewUrl} 
          alt="Preview" 
          class="max-w-full max-h-96 rounded-lg shadow-lg"
        />
      </div>
    </div>
  {/if}

  <!-- Processing Section -->
  {#if isProcessing}
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Processing</h2>
      
      <div class="space-y-4">
        <div class="flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-gray-700 dark:text-slate-300">{processingStatus}</span>
        </div>
        
        <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style="width: {progress}%"
          ></div>
        </div>
        
        <p class="text-sm text-gray-500 dark:text-slate-400 text-center">
          {progress}% complete
        </p>
      </div>
    </div>
  {/if}

  <!-- Action Buttons -->
  {#if selectedFile && !isProcessing}
    <div class="flex justify-center mb-6">
      <button 
        onclick={processImage}
        class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 transition-colors"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Extract Text
      </button>
    </div>
  {/if}

  <!-- Parsed Transactions Section -->
  {#if parsedTransactions.length > 0}
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Parsed Transactions ({parsedTransactions.length})</h2>
        <div class="flex space-x-2">
          <button 
            onclick={copyJSONToClipboard}
            class="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Copy JSON
          </button>
          <button 
            onclick={exportTransactionsJSON}
            class="inline-flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export JSON
          </button>
          <button 
            onclick={exportTransactions}
            class="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
          <thead class="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
            {#each parsedTransactions as transaction}
              <tr class="hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                  {transaction.date}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-slate-100 max-w-xs truncate" title={transaction.description}>
                  {transaction.description}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {transaction.type.includes('CREDIT') || transaction.type.includes('CR') ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}">
                    {transaction.type}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium {transaction.type.includes('CREDIT') || transaction.type.includes('CR') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                  {transaction.amount}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <!-- JSON Preview Toggle -->
      <div class="mt-4 flex justify-center">
        <button 
          onclick={() => showJSONPreview = !showJSONPreview}
          class="inline-flex items-center px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
          {showJSONPreview ? 'Hide JSON Preview' : 'Show JSON Preview'}
        </button>
      </div>
      
      <!-- JSON Preview -->
      {#if showJSONPreview}
        <div class="mt-4 bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">JSON Output Preview</h3>
          <div class="bg-gray-900 dark:bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono whitespace-pre-wrap">{generateJSONPreview()}</pre>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- JSON Output Section -->
  {#if parsedTransactions.length > 0}
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">JSON Output</h2>
        <div class="flex space-x-2">
          <button 
            onclick={copyJSONToClipboard}
            class="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Copy JSON
          </button>
          <button 
            onclick={exportTransactionsJSON}
            class="inline-flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download JSON
          </button>
        </div>
      </div>
      
      <div class="bg-gray-900 dark:bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono whitespace-pre-wrap">{generateJSONPreview()}</pre>
      </div>
      
      <div class="mt-4 text-sm text-gray-500 dark:text-slate-400">
        <p>Transactions parsed: {parsedTransactions.length}</p>
      </div>
    </div>
  {/if}

  <!-- Results Section -->
  {#if recognizedText}
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Raw OCR Text</h2>
        <div class="flex space-x-2">
          <button 
            onclick={copyToClipboard}
            class="inline-flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Copy
          </button>
          <button 
            onclick={downloadText}
            class="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download
          </button>
        </div>
      </div>
      
      <div class="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
        <pre class="whitespace-pre-wrap text-sm text-gray-900 dark:text-slate-100 font-mono">{recognizedText}</pre>
      </div>
      
      <div class="mt-4 text-sm text-gray-500 dark:text-slate-400">
        <p>Character count: {recognizedText.length}</p>
        <p>Word count: {recognizedText.trim().split(/\s+/).filter(word => word.length > 0).length}</p>
      </div>
    </div>
  {/if}

  <!-- Tips Section -->
  <div class="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">Tips for Better OCR Results</h3>
    <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-2">
      <li>• Use high-resolution images with clear, readable text</li>
      <li>• Ensure good contrast between text and background</li>
      <li>• Avoid blurry or rotated images</li>
      <li>• For handwritten text, use clear, neat handwriting</li>
      <li>• Supported formats: PNG, JPG, GIF, BMP, WEBP</li>
    </ul>
    
    <h4 class="text-md font-semibold text-blue-800 dark:text-blue-200 mb-2 mt-4">For Bank Transaction Parsing:</h4>
    <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-2">
      <li>• Works best with Indonesian bank statements (IDR currency)</li>
      <li>• Automatically detects dates, descriptions, amounts, and transaction types</li>
      <li>• Supports formats like "09 Sep 2025", "TRSF E-BANKING CR", "TRANSAKSI DEBIT"</li>
      <li>• Export parsed data as CSV for further analysis</li>
      <li>• Green amounts = Credits/Income, Red amounts = Debits/Expenses</li>
    </ul>
  </div>
</div>
