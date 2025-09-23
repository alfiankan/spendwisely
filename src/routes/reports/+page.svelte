<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Label, Modal, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Alert } from 'flowbite-svelte';
  import { PlusOutline, TrashBinOutline, EyeOutline } from 'flowbite-svelte-icons';
  import { ReportModel } from '$lib/models/ReportModel';
  import type { ExpenseRecord, ReportSummary, ExpenseSnapshot } from '$lib/types';

  let reportModel = new ReportModel();
  let reports: ExpenseRecord[] = [];
  let loading = false;
  let error = '';
  let success = '';

  // Create report modal
  let showCreateModal = false;
  let newReport = {
    rangeLabel: '',
    startDate: '',
    endDate: ''
  };

  // View report modal
  let showViewModal = false;
  let selectedReport: ExpenseRecord | null = null;
  let reportSummary: ReportSummary | null = null;
  let reportExpenses: ExpenseSnapshot[] = [];

  onMount(async () => {
    await initializeTables();
    await loadReports();
  });

  async function initializeTables() {
    try {
      await reportModel.initializeTables();
    } catch (err) {
      error = 'Failed to initialize tables: ' + (err as Error).message;
    }
  }

  async function loadReports() {
    try {
      loading = true;
      reports = await reportModel.getAllReports({
        sortBy: 'record_start',
        sortOrder: 'desc'
      });
    } catch (err) {
      error = 'Failed to load reports: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function createReport() {
    try {
      if (!newReport.rangeLabel || !newReport.startDate || !newReport.endDate) {
        error = 'Please fill in all fields';
        return;
      }

      if (new Date(newReport.startDate) >= new Date(newReport.endDate)) {
        error = 'Start date must be before end date';
        return;
      }

      const reportId = await reportModel.createReport(
        newReport.rangeLabel,
        newReport.startDate,
        newReport.endDate
      );

      // Capture expenses to the report
      await reportModel.captureExpensesToReport(reportId);

      success = 'Report created successfully';
      showCreateModal = false;
      newReport = { rangeLabel: '', startDate: '', endDate: '' };
      await loadReports();
    } catch (err) {
      error = (err as Error).message;
    }
  }

  async function viewReport(report: ExpenseRecord) {
    try {
      selectedReport = report;
      reportSummary = await reportModel.getReportSummary(report.id);
      reportExpenses = await reportModel.getReportExpenses(report.id);
      showViewModal = true;
    } catch (err) {
      error = 'Failed to load report details: ' + (err as Error).message;
    }
  }

  async function deleteReport(id: number) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await reportModel.deleteReport(id);
      success = 'Report deleted successfully';
      await loadReports();
    } catch (err) {
      error = 'Failed to delete report: ' + (err as Error).message;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  function clearMessages() {
    error = '';
    success = '';
  }
</script>

<svelte:head>
  <title>Reports - SpendWisely</title>
</svelte:head>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Expense Reports</h1>
    <Button on:click={() => { clearMessages(); showCreateModal = true; }}>
      <PlusOutline class="w-4 h-4 mr-2" />
      Create Report
    </Button>
  </div>

  {#if error}
    <Alert color="red" class="mb-4" dismissable on:close={clearMessages}>
      {error}
    </Alert>
  {/if}

  {#if success}
    <Alert color="green" class="mb-4" dismissable on:close={clearMessages}>
      {success}
    </Alert>
  {/if}

  <Card>
    <div class="overflow-x-auto">
      <Table>
        <TableHead>
          <TableHeadCell>Range Label</TableHeadCell>
          <TableHeadCell>Start Date</TableHeadCell>
          <TableHeadCell>End Date</TableHeadCell>
          <TableHeadCell>Duration</TableHeadCell>
          <TableHeadCell>Actions</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if loading}
            <TableBodyRow>
              <TableBodyCell colspan="5" class="text-center py-8">
                Loading reports...
              </TableBodyCell>
            </TableBodyRow>
          {:else if reports.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan="5" class="text-center py-8 text-gray-500">
                No reports found. Create your first report to get started.
              </TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each reports as report}
              <TableBodyRow>
                <TableBodyCell class="font-medium">{report.record_range_label}</TableBodyCell>
                <TableBodyCell>{formatDate(report.record_start)}</TableBodyCell>
                <TableBodyCell>{formatDate(report.record_end)}</TableBodyCell>
                <TableBodyCell>
                  {Math.ceil((new Date(report.record_end).getTime() - new Date(report.record_start).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex space-x-2">
                    <Button size="xs" color="blue" on:click={() => viewReport(report)}>
                      <EyeOutline class="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button size="xs" color="red" on:click={() => deleteReport(report.id)}>
                      <TrashBinOutline class="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    </div>
  </Card>
</div>

<!-- Create Report Modal -->
<Modal bind:open={showCreateModal} size="md" autoclose={false}>
  <div class="text-center">
    <h3 class="mb-5 text-lg font-normal text-gray-500">Create New Report</h3>
    
    <div class="space-y-4 text-left">
      <div>
        <Label for="rangeLabel" class="mb-2">Range Label</Label>
        <Input
          id="rangeLabel"
          bind:value={newReport.rangeLabel}
          placeholder="e.g., January 2025 - Week 1"
          required
        />
      </div>
      
      <div>
        <Label for="startDate" class="mb-2">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          bind:value={newReport.startDate}
          required
        />
      </div>
      
      <div>
        <Label for="endDate" class="mb-2">End Date</Label>
        <Input
          id="endDate"
          type="date"
          bind:value={newReport.endDate}
          required
        />
      </div>
    </div>
    
    <div class="flex justify-center space-x-4 mt-6">
      <Button color="green" on:click={createReport}>Create Report</Button>
      <Button color="alternative" on:click={() => showCreateModal = false}>Cancel</Button>
    </div>
  </div>
</Modal>

<!-- View Report Modal -->
<Modal bind:open={showViewModal} size="xl" autoclose={false}>
  {#if selectedReport && reportSummary}
    <div class="space-y-6">
      <div class="text-center">
        <h3 class="text-xl font-bold text-gray-900">{selectedReport.record_range_label}</h3>
        <p class="text-gray-500">{formatDate(selectedReport.record_start)} - {formatDate(selectedReport.record_end)}</p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card class="text-center">
          <h4 class="text-sm font-medium text-gray-500">Total Budget</h4>
          <p class="text-lg font-bold text-blue-600">{formatCurrency(reportSummary.totalBudget)}</p>
        </Card>
        
        <Card class="text-center">
          <h4 class="text-sm font-medium text-gray-500">Total Expenses</h4>
          <p class="text-lg font-bold text-red-600">{formatCurrency(reportSummary.totalExpenses)}</p>
        </Card>
        
        <Card class="text-center">
          <h4 class="text-sm font-medium text-gray-500">Remaining</h4>
          <p class="text-lg font-bold {reportSummary.remaining >= 0 ? 'text-green-600' : 'text-red-600'}">
            {formatCurrency(reportSummary.remaining)}
          </p>
        </Card>
        
        <Card class="text-center">
          <h4 class="text-sm font-medium text-gray-500">Budget Used</h4>
          <p class="text-lg font-bold {reportSummary.percentageUsed <= 100 ? 'text-green-600' : 'text-red-600'}">
            {reportSummary.percentageUsed.toFixed(1)}%
          </p>
        </Card>
      </div>

      <!-- Expenses by Category -->
      <Card>
        <h4 class="text-lg font-semibold mb-3">Expenses by Category</h4>
        <div class="space-y-2">
          {#each Object.entries(reportSummary.expensesByCategory) as [category, amount]}
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">{category}</span>
              <span class="text-sm">{formatCurrency(amount)}</span>
            </div>
          {/each}
        </div>
      </Card>

      <!-- Expenses by Label -->
      <Card>
        <h4 class="text-lg font-semibold mb-3">Expenses by Label</h4>
        <div class="space-y-2">
          {#each Object.entries(reportSummary.expensesByLabel) as [label, amount]}
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">{label}</span>
              <span class="text-sm">{formatCurrency(amount)}</span>
            </div>
          {/each}
        </div>
      </Card>

      <!-- Max Expense & Comparison -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h4 class="text-lg font-semibold mb-3">Highest Expense</h4>
          <div class="space-y-1">
            <p class="font-medium">{reportSummary.maxExpense.title}</p>
            <p class="text-lg font-bold text-red-600">{formatCurrency(reportSummary.maxExpense.amount)}</p>
            <p class="text-sm text-gray-500">{formatDate(reportSummary.maxExpense.datetime)}</p>
          </div>
        </Card>

        {#if reportSummary.comparisonWithPrevious}
          <Card>
            <h4 class="text-lg font-semibold mb-3">Comparison with Previous</h4>
            <div class="space-y-1">
              <p class="text-sm">Previous: {formatCurrency(reportSummary.comparisonWithPrevious.previousTotal)}</p>
              <p class="text-sm">Current: {formatCurrency(reportSummary.totalExpenses)}</p>
              <p class="text-lg font-bold {reportSummary.comparisonWithPrevious.difference >= 0 ? 'text-red-600' : 'text-green-600'}">
                {reportSummary.comparisonWithPrevious.difference >= 0 ? '+' : ''}{formatCurrency(reportSummary.comparisonWithPrevious.difference)}
                ({reportSummary.comparisonWithPrevious.percentageChange >= 0 ? '+' : ''}{reportSummary.comparisonWithPrevious.percentageChange.toFixed(1)}%)
              </p>
            </div>
          </Card>
        {/if}
      </div>

      <!-- Expenses List -->
      <Card>
        <h4 class="text-lg font-semibold mb-3">Captured Expenses ({reportExpenses.length})</h4>
        <div class="max-h-64 overflow-y-auto">
          <Table>
            <TableHead>
              <TableHeadCell>Title</TableHeadCell>
              <TableHeadCell>Amount</TableHeadCell>
              <TableHeadCell>Category</TableHeadCell>
              <TableHeadCell>Label</TableHeadCell>
              <TableHeadCell>Date</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each reportExpenses as expense}
                <TableBodyRow>
                  <TableBodyCell class="font-medium">{expense.title}</TableBodyCell>
                  <TableBodyCell>{formatCurrency(expense.amount)}</TableBodyCell>
                  <TableBodyCell>{expense.category}</TableBodyCell>
                  <TableBodyCell>{expense.labels}</TableBodyCell>
                  <TableBodyCell>{formatDate(expense.datetime)}</TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div class="flex justify-center">
        <Button color="alternative" on:click={() => showViewModal = false}>Close</Button>
      </div>
    </div>
  {/if}
</Modal>