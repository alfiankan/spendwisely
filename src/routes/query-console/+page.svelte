<script context="module">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { Modal } from "flowbite-svelte";
  import { Chart, registerables } from "chart.js";
  import { execQueryProxy } from "$lib/api";

  // Register zoom plugin only on client side
  let zoomPlugin: any = null;

  // --- STATE ---
  let editorContainer: HTMLDivElement;
  let editor: any;
  let query = $state("SELECT category, sum(amount) amount FROM expenses GROUP BY category");
  let results = $state<any[]>([]);
  let showChart = $state(false);
  let xColumn = $state("-");
  let yColumn = $state("-");
  let chartType = $state<"line" | "bar" | "-">("line");
  let savedQueries = $state<any[]>([]);
  let title = $state("");
  let chartCanvas: HTMLCanvasElement;
  let chartInstance: Chart | null = null;
  let showSaveModal = $state(false);
  
  // Modal states
  let showChartWarningModal = $state(false);
  let showSaveErrorModal = $state(false);
  let showSaveSuccessModal = $state(false);
  let showDeleteConfirmModal = $state(false);
  let showDeleteSuccessModal = $state(false);
  let deleteQueryId = $state<number | null>(null);
  let isDeleting = $state(false);
  let isQueryRunning = $state(false);
  let showResultsTable = $state(true);

  const columns = () => (results[0] ? Object.keys(results[0]) : []);

  // --- MONACO EDITOR INIT ---
  onMount(async () => {
    // Import and register zoom plugin only on client side
    zoomPlugin = await import("chartjs-plugin-zoom");
    const zoomPluginModule = zoomPlugin.default || zoomPlugin;
    Chart.register(...registerables, zoomPluginModule);
    console.log("Zoom plugin registered:", zoomPluginModule);

    const monaco = await import("monaco-editor");

    editor = monaco.editor.create(editorContainer, {
      value: query,
      language: "sql",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
    });

    editor.onDidChangeModelContent(() => {
      query = editor.getValue();
    });

    // Simple SQL autocomplete
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: () => {
        const suggestions = [
          "SELECT",
          "FROM",
          "WHERE",
          "GROUP BY",
          "ORDER BY",
          "INSERT INTO",
          "UPDATE",
          "DELETE",
          "expenses",
          "title",
          "category",
          "labels",
          "amount",
          "id"
        ].map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw + " ",
        }));
        return { suggestions };
      },
    });

    await fetchSavedQueries();
  });

  // --- FETCH / RUN QUERIES ---
  async function fetchSavedQueries() {
    const data = await execQueryProxy("SELECT * FROM saved_queries ORDER BY id DESC", []);
    savedQueries = data.result?.[0]?.results || [];
  }

  async function runQuery() {
    isQueryRunning = true;
    try {
      const data = await execQueryProxy(query, []);
      results = data.result?.[0]?.results || [];
      showChart = false;
    } finally {
      isQueryRunning = false;
    }
  }

  // --- CHART FUNCTIONS ---
  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function createChart() {
    if (!chartCanvas || !results.length || xColumn === "-" || yColumn === "-") return;

    destroyChart();

    const labels = results.map((row) => row[xColumn]);
    const data = results.map((row) => Number(row[yColumn]));

    // Reset canvas width for responsive chart with zoom
    chartCanvas.style.width = '100%';

    console.log("Creating chart with zoom plugin available:", !!zoomPlugin);
    
    chartInstance = new Chart(chartCanvas, {
      type: chartType === "line" ? "line" : "bar",
      data: {
        labels,
        datasets: [
          {
            label: yColumn,
            data,
            borderColor: "rgb(59, 130, 246)",
            backgroundColor:
              chartType === "bar" ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: chartType === "line",
            tension: chartType === "line" ? 0.4 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: `${yColumn} over ${xColumn}` },
          legend: { display: false },
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
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v: any) =>
                new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(v),
            },
          },
        },
      },
    });
    
    console.log("Chart created:", chartInstance);
  }

  function toggleChart() {
    if (showChart) {
      destroyChart();
      showChart = false;
    } else if (results.length && xColumn !== "-" && yColumn !== "-") {
      showChart = true;
      setTimeout(createChart, 100);
    } else {
      showChartWarningModal = true;
    }
  }

  function resetZoom() {
    if (chartInstance && chartInstance.resetZoom) {
      chartInstance.resetZoom();
    }
  }

  // --- SAVE / LOAD QUERIES ---
  function openSaveModal() {
    showSaveModal = true;
  }

  function closeSaveModal() {
    showSaveModal = false;
    title = "";
  }

  async function saveCurrentQuery() {
    if (!title.trim()) {
      showSaveErrorModal = true;
      return;
    }
    const sql = `INSERT INTO saved_queries (title, sql, xColumn, yColumn, chart_type) VALUES (?, ?, ?, ?, ?)`;
    await execQueryProxy(sql, [title, query, xColumn, yColumn, chartType]);
    showSaveSuccessModal = true;
    closeSaveModal();
    await fetchSavedQueries();
  }

  function loadSavedQuery(sq: any) {
    query = sq.sql;
    xColumn = sq.xColumn || "-";
    yColumn = sq.yColumn || "-";
    chartType = sq.chart_type || "line";
    showChart = false;

    if (editor) editor.setValue(query);
  }

  function deleteSavedQuery(id: number) {
    deleteQueryId = id;
    showDeleteConfirmModal = true;
  }

  async function confirmDelete() {
    console.log(deleteQueryId)
    if (deleteQueryId === null) return;
    
    isDeleting = true;
    try {
      await execQueryProxy("DELETE FROM saved_queries WHERE id = ?", [deleteQueryId]);
      showDeleteConfirmModal = false;
      showDeleteSuccessModal = true;
      deleteQueryId = null;
      await fetchSavedQueries();
    } finally {
      isDeleting = false;
    }
  }

  // --- Reactive Chart Refresh ---
  $effect(() => {
    if (showChart && chartInstance && chartType !== "-") {
      createChart();
    }
  });
</script>

<h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Query Console</h2>

<div class="space-y-3">
  <!-- Monaco Editor -->
  <div bind:this={editorContainer} class="h-40 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"></div>

  <button 
    class="text-blue-700 dark:text-blue-400 border border-blue-700 dark:border-blue-400 rounded px-5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center" 
    onclick={runQuery}
    disabled={isQueryRunning}
  >
    {#if isQueryRunning}
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Running...
    {:else}
      Run Query
    {/if}
  </button>

  {#if results.length > 0}
    <!-- Results Table -->
    <div class="mt-4">
      <button 
        class="flex items-center justify-between w-full p-4 text-left text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-4 focus:ring-gray-200 dark:focus:ring-slate-500"
        onclick={() => showResultsTable = !showResultsTable}
      >
        <span class="font-medium text-gray-900 dark:text-slate-100">Query Results ({results.length} rows)</span>
        <svg class="w-3 h-3 transition-transform duration-200 {showResultsTable ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div class="overflow-hidden transition-all duration-300 ease-in-out {showResultsTable ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}">
        <div class="overflow-auto max-h-[500px] border border-t-0 rounded-b-lg bg-white dark:bg-slate-800">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 dark:text-slate-200 uppercase bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
              <tr>{#each columns() as col}<th class="px-4 py-2">{col}</th>{/each}</tr>
            </thead>
            <tbody>
              {#each results as row}
                <tr class="border-t border-gray-200 dark:border-slate-600">{#each columns() as col}<td class="px-4 py-2 text-gray-900 dark:text-slate-100">{row[col]}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Chart Controls -->
    <div class="mt-6 bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
      <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-slate-100">Chart Configuration</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-gray-700 dark:text-slate-200">X-axis</label>
          <select bind:value={xColumn} class="w-full border border-gray-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
            <option value="-">Select column</option>
            {#each columns() as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <div>
          <label class="block mb-2 text-gray-700 dark:text-slate-200">Y-axis</label>
          <select bind:value={yColumn} class="w-full border border-gray-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
            <option value="-">Select column</option>
            {#each columns() as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <div>
          <label class="block mb-2 text-gray-700 dark:text-slate-200">Chart Type</label>
          <select bind:value={chartType} class="w-full border border-gray-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
            <option value="-">Select type</option>
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            class="w-full text-emerald-700 border border-emerald-700 rounded px-4 py-2.5"
            onclick={toggleChart}
            disabled={xColumn === "-" || yColumn === "-" || chartType === "-"}
          >
            {showChart ? "Hide Chart" : "Show Chart"}
          </button>
        </div>
      </div>
    </div>

    <!-- Chart -->
    {#if showChart}
      <div class="mt-6 p-4 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">Chart: {yColumn} over {xColumn}</h3>
        <div class="relative h-96">
          <canvas bind:this={chartCanvas}></canvas>
        </div>
        <div class="mt-4 flex justify-center gap-2">
          <button class="text-indigo-700 dark:text-indigo-400 border border-indigo-700 dark:border-indigo-400 rounded px-6 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" onclick={openSaveModal}>
            Save Query & Chart
          </button>
          <button class="text-gray-700 dark:text-slate-300 border border-gray-700 dark:border-slate-500 rounded px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700" onclick={resetZoom}>
            Reset Zoom
          </button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Saved Queries -->
  <div class="mt-6">
    <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Saved Queries</h3>
    <div class="flex flex-col gap-2">
      {#each savedQueries as sq}
        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700">
          <div>
            <div class="font-semibold text-gray-900 dark:text-slate-100">{sq.title || sq.sql}</div>
            <div class="text-xs text-gray-600 dark:text-slate-400">
              Chart: {sq.chart_type || "line"} | X: {sq.xColumn || "-"} | Y: {sq.yColumn || "-"}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700" onclick={() => loadSavedQuery(sq)}>Load</button>
            <button class="px-3 py-1 border border-red-300 dark:border-red-600 rounded bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" onclick={() => deleteSavedQuery(sq.id)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Save Modal -->
{#if showSaveModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Save Query & Chart</h3>
      <input type="text" bind:value={title} placeholder="Enter title" class="w-full border border-gray-300 dark:border-slate-600 rounded p-2.5 mb-4 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100"/>
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500" onclick={closeSaveModal}>Cancel</button>
        <button class="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600" onclick={saveCurrentQuery}>Save</button>
      </div>
    </div>
  </div>
{/if}

<!-- Chart Warning Modal -->
<Modal bind:open={showChartWarningModal} size="sm">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
      <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Cannot show chart</h3>
    <p class="text-sm text-gray-500 dark:text-slate-300 mb-4">Please run a query first and select X and Y columns</p>
    <button class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700" onclick={() => showChartWarningModal = false}>OK</button>
  </div>
</Modal>

<!-- Save Error Modal -->
<Modal bind:open={showSaveErrorModal} size="sm">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
      <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Error</h3>
    <p class="text-sm text-gray-500 dark:text-slate-300 mb-4">Please provide a title for this query</p>
    <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onclick={() => showSaveErrorModal = false}>OK</button>
  </div>
</Modal>

<!-- Save Success Modal -->
<Modal bind:open={showSaveSuccessModal} size="sm">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
      <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Saved!</h3>
    <p class="text-sm text-gray-500 dark:text-slate-300 mb-4">Your query has been saved.</p>
    <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onclick={() => showSaveSuccessModal = false}>OK</button>
  </div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteConfirmModal} size="sm">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
      <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Are you sure?</h3>
    <p class="text-sm text-gray-500 dark:text-slate-300 mb-4">Delete this saved query?</p>
    <div class="flex justify-center gap-2">
      <button 
        class="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed" 
        onclick={() => showDeleteConfirmModal = false} 
        disabled={isDeleting}
      >
        Cancel
      </button>
      <button 
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center" 
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
          Yes, delete it!
        {/if}
      </button>
    </div>
  </div>
</Modal>

<!-- Delete Success Modal -->
<Modal bind:open={showDeleteSuccessModal} size="sm">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
      <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Deleted!</h3>
    <p class="text-sm text-gray-500 dark:text-slate-300 mb-4">Your saved query has been deleted.</p>
    <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onclick={() => showDeleteSuccessModal = false}>OK</button>
  </div>
</Modal>
