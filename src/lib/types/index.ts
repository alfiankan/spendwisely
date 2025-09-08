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
  d1ProxyUrl: string;
  d1Token: string;
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

// Constants
export const CATEGORIES = ["BASIC NEEDS", "TERSIER", "EMERGENCY"] as const;
export const LABELS = ["FOOD & BEVERAGE", "GROCERIES", "TRANSPORT", "ENTERTAIMENT", "HEALTH", "OTHER", "LIVING", "EMERGENCY", "SELF DEV", "SOCIAL"] as const;

export type Category = typeof CATEGORIES[number];
export type Label = typeof LABELS[number];
