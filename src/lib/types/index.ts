// Core domain types
export interface Expense {
  id: number;
  title: string;
  note: string;
  amount: number;
  datetime: string;
  labels: string;
  category: string;
  attachments?: string; // JSON string of attachment URLs
}

export interface ExpenseFilters {
  label: string;
  category: string;
  startDate: string;
  endDate: string;
  sortBy: 'datetime' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export interface ExpenseStatistics {
  totalSpent: number;
  budget: number;
  remaining: number;
  percentageUsed: number;
  averageSpent: number;
  maxSpent: number;
  minSpent: number;
}

export interface Settings {
  budget: number;
  tursoHost: string;
  tursoToken: string;
}

export interface SettingItem {
  key: string;
  value: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  results?: T[];
  errors?: ApiError[];
}

export interface ApiError {
  code: number;
  message: string;
}

export interface QueryResult {
  results: any[];
  meta?: {
    changes: number;
    duration: number;
  };
}

// Turso HTTP API response types
export interface TursoResponse {
  baton: string | null;
  base_url: string | null;
  results: TursoResult[];
}

export interface TursoResult {
  type: 'ok' | 'error';
  response?: {
    type: 'execute' | 'close';
    result?: {
      cols: TursoColumn[];
      rows: TursoRow[][];
      affected_row_count: number;
      last_insert_rowid: string | null;
      replication_index: string | null;
      rows_read: number;
      rows_written: number;
      query_duration_ms: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TursoColumn {
  name: string;
  decltype: string;
}

export interface TursoRow {
  type: 'null' | 'integer' | 'float' | 'text' | 'blob';
  value: string | null;
}

export interface TursoArg {
  type: 'null' | 'integer' | 'float' | 'text' | 'blob';
  value: string | null;
}

// File upload types
export interface FileUploadResult {
  url: string;
  fileName: string;
}

export interface AttachmentInfo {
  url: string;
  fileName: string;
}

// Modal and UI types
export interface ModalResult {
  type: 'success' | 'error';
  message: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

// Query console types
export interface SavedQuery {
  id: number;
  title: string;
  sql: string;
  chart_type: string;
  xColumn: string;
  yColumn: string;
}

export interface QueryExecutionResult {
  results: any[];
  executionTime: number;
  rowCount: number;
}

// Report types
export interface ExpenseRecord {
  id: number;
  record_range_label: string;
  record_start: string;
  record_end: string;
}

export interface ExpenseSnapshot {
  id: number;
  report_id: number;
  title: string;
  note: string;
  amount: number;
  datetime: string;
  labels: string;
  category: string;
  attachments?: string;
}

export interface ReportSummary {
  totalBudget: number;
  totalExpenses: number;
  remaining: number;
  percentageUsed: number;
  expensesByCategory: { [category: string]: number };
  expensesByLabel: { [label: string]: number };
  maxExpense: { amount: number; title: string; datetime: string };
  averageExpense: number;
  comparisonWithPrevious?: {
    previousTotal: number;
    difference: number;
    percentageChange: number;
  };
}

export interface ReportFilters {
  sortBy: 'record_start' | 'record_end';
  sortOrder: 'asc' | 'desc';
}

// Constants
export const CATEGORIES = ["BASIC NEEDS", "TERSIER", "EMERGENCY"] as const;
export const LABELS = ["FOOD & BEVERAGE", "GROCERIES", "TRANSPORT", "ENTERTAIMENT", "HEALTH", "OTHER", "LIVING", "EMERGENCY", "SELF DEV", "SOCIAL"] as const;

export type Category = typeof CATEGORIES[number];
export type Label = typeof LABELS[number];
