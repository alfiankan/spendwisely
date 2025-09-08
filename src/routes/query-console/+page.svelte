<script context="module">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { Modal } from "flowbite-svelte";
  import { Chart, registerables } from "chart.js";
  import { QueryPresenter } from '$lib/presenters/QueryPresenter';
  import type { 
    QueryExecutionResult, 
    SavedQuery, 
    ChartData, 
    ModalResult 
  } from '$lib/types';

  // Presenter instance
  let presenter: QueryPresenter;

  // State
  let query = $state("SELECT category, sum(amount) amount FROM expenses GROUP BY category");
  let queryResult = $state<QueryExecutionResult | null>(null);
  let chartData = $state<ChartData | null>(null);
  let savedQueries = $state<SavedQuery[]>([]);
  let showChart = $state(false);
  let showResultsTable = $state(true);
  let loading = $state(false);
  let error = $state('');

  // Chart state
  let xColumn = $state("-");
  let yColumn = $state("-");
  let chartType = $state<"line" | "bar" | "-">("line");
  let chartCanvas: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  // Modal states
  let showSaveModal = $state(false);
  let showChartWarningModal = $state(false);
  let showSaveErrorModal = $state(false);
  let showSaveSuccessModal = $state(false);
  let showDeleteConfirmModal = $state(false);
  let showDeleteSuccessModal = $state(false);
  let deleteQueryId = $state<number | null>(null);
  let isDeleting = $state(false);
  let isQueryRunning = $state(false);
  let saveQueryTitle = $state("");

  // Monaco Editor
  let editorContainer: HTMLDivElement;
  let editor: any;
  let zoomPlugin: any = null;

  // Initialize presenter and set up state setters
  onMount(async () => {
    presenter = new QueryPresenter();
    
    // Inject state setters into presenter
    presenter.setQueryResult = (result: QueryExecutionResult | null) => {
      queryResult = result;
    };
    
    presenter.setChartData = (data: ChartData | null) => {
      chartData = data;
    };
    
    presenter.setSavedQueries = (queries: SavedQuery[]) => {
      savedQueries = queries;
    };
    
    presenter.showModal = (modalResult: ModalResult) => {
      if (modalResult.type === 'success') {
        showSaveSuccessModal = true;
      } else {
        showSaveErrorModal = true;
      }
    };
    
    presenter.setLoading = (isLoading: boolean) => {
      loading = isLoading;
      isQueryRunning = isLoading;
    };
    
    presenter.setError = (errorMessage: string) => {
      error = errorMessage;
    };

    // Initialize Monaco Editor and Chart.js
    await initializeEditor();
    await initializeChart();
    await loadSavedQueries();
    
    // Cleanup function
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
    };
  });

  async function initializeEditor() {
    const monaco = await import("monaco-editor");
    editor = monaco.editor.create(editorContainer, {
      value: query,
      language: "sql",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: "line",
    });

    // Update query when editor content changes
    editor.onDidChangeModelContent(() => {
      query = editor.getValue();
    });
  }

  async function initializeChart() {
    // Import and register zoom plugin only on client side
    zoomPlugin = await import("chartjs-plugin-zoom");
    const zoomPluginModule = zoomPlugin.default || zoomPlugin;
    Chart.register(...registerables, zoomPluginModule);
    console.log("Zoom plugin registered:", zoomPluginModule);
  }

  async function loadSavedQueries() {
    console.log('Loading saved queries...');
    await presenter.loadSavedQueries();
    console.log('Saved queries loaded:', savedQueries);
  }

  async function runQuery() {
    // Validate query using presenter
    const validationErrors = presenter.validateQuery(query);
    if (validationErrors.length > 0) {
      error = validationErrors.join(', ');
      return;
    }

    // Clear previous errors
    error = '';

    // Execute query using presenter
    await presenter.executeQuery(query);
  }

  function toggleChart() {
    showChart = !showChart;
    if (showChart && chartData) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        renderChart();
      }, 100);
    } else if (!showChart && chartInstance) {
      // Clean up chart when hiding
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function toggleResultsTable() {
    showResultsTable = !showResultsTable;
  }

  function generateCustomChart() {
    if (!queryResult || !xColumn || !yColumn || !chartType || xColumn === '-' || yColumn === '-' || chartType === '-') {
      error = 'Please select X column, Y column, and chart type';
      return;
    }

    // Check if Y column contains numeric values
    const isNumeric = queryResult.results.every(row => 
      !isNaN(Number(row[yColumn]))
    );

    if (!isNumeric) {
      error = 'Y column must contain numeric values for charting';
      return;
    }

    // Clear previous errors
    error = '';

    // Generate custom chart data - create plain objects, not $state objects
    const labels = queryResult.results.map(row => String(row[xColumn]));
    const data = queryResult.results.map(row => Number(row[yColumn]));
    
    const customChartData = {
      labels: labels,
      datasets: [{
        label: yColumn,
        data: data,
        backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.5)' : undefined,
        borderColor: 'rgba(59, 130, 246, 1)',
        fill: chartType === 'line' ? false : undefined,
      }],
    };

    chartData = customChartData;
    showChart = true;
    
    // Render the chart after a short delay to ensure DOM is updated
    setTimeout(renderChart, 100);
  }

  function renderChart() {
    if (!chartData || !chartCanvas || !chartCanvas.getContext) return;

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const ctx = chartCanvas.getContext('2d');
    if (!ctx) return;

    // Create a deep copy of chart data to avoid $state issues
    const chartDataCopy = {
      labels: [...chartData.labels],
      datasets: chartData.datasets.map(dataset => ({
        ...dataset,
        data: [...dataset.data]
      }))
    };

    chartInstance = new Chart(ctx, {
      type: chartType === 'line' ? 'line' : 'bar',
      data: chartDataCopy,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 16 / 9,
        plugins: {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'x',
            },
            pan: {
              enabled: true,
              mode: 'x',
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function resetZoom() {
    if (chartInstance) {
      chartInstance.resetZoom();
    }
  }

  function openSaveModal() {
    saveQueryTitle = "";
    showSaveModal = true;
  }

  function closeSaveModal() {
    showSaveModal = false;
    saveQueryTitle = "";
  }

  async function saveCurrentQuery() {
    if (!saveQueryTitle.trim()) {
      error = "Please enter a title for the query";
      return;
    }

    await presenter.saveQuery(saveQueryTitle.trim(), query);
    closeSaveModal();
  }

  function loadSavedQuery(savedQuery: SavedQuery) {
    console.log('Loading saved query:', savedQuery);
    
    if (!savedQuery || !savedQuery.sql) {
      console.error('Invalid saved query:', savedQuery);
      return;
    }
    
    // Update the query text
    query = savedQuery.sql;
    
    // Update the Monaco editor if it exists
    if (editor) {
      editor.setValue(savedQuery.sql);
      console.log('Monaco editor updated with query');
    } else {
      console.warn('Monaco editor not available yet, will retry...');
      // Retry after a short delay
      setTimeout(() => {
        if (editor) {
          editor.setValue(savedQuery.sql);
          console.log('Monaco editor updated on retry');
        }
      }, 100);
    }
    
    // Clear any previous results and chart data
    queryResult = null;
    chartData = null;
    showChart = false;
    
    // Reset chart configuration
    xColumn = '-';
    yColumn = '-';
    chartType = 'line';
    
    console.log('Query loaded successfully:', query);
  }

  function showDeleteConfirm(queryId: number) {
    deleteQueryId = queryId;
    showDeleteConfirmModal = true;
  }

  function closeDeleteConfirm() {
    showDeleteConfirmModal = false;
    deleteQueryId = null;
  }

  async function confirmDelete() {
    if (deleteQueryId) {
      await presenter.deleteSavedQuery(deleteQueryId);
      closeDeleteConfirm();
    }
  }

  function closeModals() {
    showSaveModal = false;
    showChartWarningModal = false;
    showSaveErrorModal = false;
    showSaveSuccessModal = false;
    showDeleteConfirmModal = false;
    showDeleteSuccessModal = false;
    saveQueryTitle = "";
    deleteQueryId = null;
  }

  function formatExecutionTime(time: number): string {
    return presenter.formatExecutionTime(time);
  }

  function getColumns(): string[] {
    return queryResult?.results?.[0] ? Object.keys(queryResult.results[0]) : [];
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Query Console</h2>
  
  {#if error}
    <div class="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
      {error}
    </div>
  {/if}

  <!-- Query Editor -->
  <div class="mb-6">
    <div class="bg-gray-900 rounded-lg p-4">
      <div bind:this={editorContainer} class="h-64"></div>
    </div>
    
    <div class="mt-4 flex gap-2">
      <button 
        class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={runQuery}
        disabled={isQueryRunning}
      >
        {isQueryRunning ? 'Running...' : 'Run Query'}
      </button>
      
      <button 
        class="text-green-700 dark:text-green-400 bg-white dark:bg-slate-800 border border-green-700 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 focus:ring-4 focus:ring-green-300 dark:focus:ring-green-600 font-medium rounded-lg text-sm px-4 py-2"
        onclick={openSaveModal}
      >
        Save Query
      </button>
    </div>
  </div>

  <!-- Results Section -->
  {#if queryResult}
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Results ({queryResult.rowCount} rows, {formatExecutionTime(queryResult.executionTime)})
        </h3>
        
        <div class="flex gap-2">
          <button 
            class="text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 font-medium rounded-lg text-sm px-3 py-1"
            onclick={toggleResultsTable}
          >
            {showResultsTable ? 'Hide' : 'Show'} Table
          </button>
        </div>
      </div>

      <!-- Results Table -->
      {#if showResultsTable}
        <div class="overflow-auto max-h-96 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 mb-4">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700 sticky top-0">
              <tr>
                {#each getColumns() as column}
                  <th class="px-4 py-2">{column}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each queryResult.results as row}
                <tr class="border-t border-gray-200 dark:border-slate-600">
                  {#each getColumns() as column}
                    <td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row[column]}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Chart Configuration -->
      {#if queryResult && queryResult.results.length > 0}
        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4 mb-4">
          <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-4">Chart Configuration</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">X Axis (Labels)</label>
              <select 
                bind:value={xColumn}
                class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5"
              >
                <option value="-">Select X Column</option>
                {#each getColumns() as column}
                  <option value={column}>{column}</option>
                {/each}
              </select>
              {#if xColumn && xColumn !== '-'}
                <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Selected: {xColumn}</p>
              {/if}
            </div>
            
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Y Axis (Data)</label>
              <select 
                bind:value={yColumn}
                class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5"
              >
                <option value="-">Select Y Column</option>
                {#each getColumns() as column}
                  <option value={column}>{column}</option>
                {/each}
              </select>
              {#if yColumn && yColumn !== '-'}
                <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Selected: {yColumn}</p>
              {/if}
            </div>
            
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Chart Type</label>
              <select 
                bind:value={chartType}
                class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5"
              >
                <option value="-">Select Chart Type</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
              {#if chartType && chartType !== '-'}
                <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Selected: {chartType === 'line' ? 'Line Chart' : 'Bar Chart'}</p>
              {/if}
            </div>
          </div>
          
          <div class="mt-4 flex gap-2">
            <button 
              class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-4 py-2"
              onclick={generateCustomChart}
            >
              Generate Chart
            </button>
            
            {#if chartData}
              <button 
                class="text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-800 border border-purple-700 dark:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-600 font-medium rounded-lg text-sm px-4 py-2"
                onclick={toggleChart}
              >
                {showChart ? 'Hide' : 'Show'} Chart
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Chart -->
      {#if showChart && chartData}
        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-md font-semibold text-gray-900 dark:text-white">Chart Visualization</h4>
            <button 
              class="text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 font-medium rounded-lg text-sm px-3 py-1"
              onclick={resetZoom}
            >
              Reset Zoom
            </button>
          </div>
          <div class="relative h-96">
            <canvas bind:this={chartCanvas}></canvas>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Saved Queries -->
  <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Saved Queries</h3>
    
    {#if savedQueries.length === 0}
      <p class="text-gray-500 dark:text-slate-400">No saved queries found.</p>
    {:else}
      <div class="space-y-2">
        {#each savedQueries as savedQuery}
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <div class="flex-1">
              <h4 class="font-semibold text-lg text-gray-900 dark:text-slate-100 mb-2">{savedQuery.title}</h4>
              <div class="text-xs text-gray-600 dark:text-slate-400">
                Chart: {savedQuery.chart_type || "line"} | X: {savedQuery.xColumn || "-"} | Y: {savedQuery.yColumn || "-"}
              </div>
            </div>
            <div class="flex gap-2">
              <button 
                class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-3 py-1"
                onclick={() => {
                  console.log('Load button clicked for:', savedQuery);
                  loadSavedQuery(savedQuery);
                }}
              >
                Load
              </button>
              <button 
                class="text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-700 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-600 font-medium rounded-lg text-sm px-3 py-1"
                onclick={() => showDeleteConfirm(savedQuery.id)}
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Save Query Modal -->
{#if showSaveModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Save Query</h3>
      
      <div class="mb-4">
        <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Query Title</label>
        <input 
          type="text" 
          bind:value={saveQueryTitle}
          class="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-2.5" 
          placeholder="Enter query title"
        />
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          class="text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 font-medium rounded-lg text-sm px-4 py-2"
          onclick={closeSaveModal}
        >
          Cancel
        </button>
        <button 
          class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-4 py-2"
          onclick={saveCurrentQuery}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
        Are you sure you want to delete this saved query? This action cannot be undone.
      </p>
      
      <div class="flex justify-end space-x-3">
        <button 
          class="text-gray-700 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-700 dark:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={closeDeleteConfirm}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button 
          class="text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-700 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-600 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          onclick={confirmDelete}
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

<!-- Success/Error Modals -->
{#if showSaveSuccessModal || showSaveErrorModal || showDeleteSuccessModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        {#if showSaveSuccessModal || showDeleteSuccessModal}
          <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {:else}
          <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {/if}
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {#if showSaveSuccessModal}
            Success
          {:else if showDeleteSuccessModal}
            Success
          {:else}
            Error
          {/if}
        </h3>
      </div>
      
      <p class="text-gray-600 dark:text-slate-300 mb-6">
        {#if showSaveSuccessModal}
          Query saved successfully!
        {:else if showDeleteSuccessModal}
          Query deleted successfully!
        {:else}
          Failed to save query. Please try again.
        {/if}
      </p>
      
      <div class="flex justify-end">
        <button 
          class="text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 font-medium rounded-lg text-sm px-4 py-2"
          onclick={closeModals}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}