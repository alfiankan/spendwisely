import { BasePresenter } from './BasePresenter';
import { ExpenseModel } from '../models/ExpenseModel';
import { FileModel } from '../models/FileModel';
import type { 
  Expense, 
  ExpenseFilters, 
  ExpenseStatistics, 
  AttachmentInfo 
} from '../types';

export class ExpensePresenter extends BasePresenter {
  private expenseModel: ExpenseModel;
  private fileModel: FileModel;

  constructor() {
    super();
    this.expenseModel = new ExpenseModel();
    this.fileModel = new FileModel();
  }

  // State setters (to be injected by the view)
  setExpenses: (expenses: Expense[]) => void = () => {};
  setStatistics: (stats: ExpenseStatistics) => void = () => {};
  setSelectedFiles: (files: File[]) => void = () => {};
  setUploadingFiles: (uploading: boolean) => void = () => {};

  async loadExpenses(filters: ExpenseFilters): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.expenseModel.getAllExpenses(filters),
    );

    if (result) {
      this.setExpenses(result);
      await this.calculateStatistics(result);
    }
  }

  async createExpense(
    expenseData: Omit<Expense, 'id' | 'attachments'>,
    files: File[]
  ): Promise<void> {
    const result = await this.executeWithLoading(async () => {
      this.setUploadingFiles(true);
      
      // Convert files to base64 if any
      let attachmentsData: string | undefined;
      if (files.length > 0) {
        const base64Files = await this.convertFilesToBase64(files);
        attachmentsData = JSON.stringify(base64Files);
      }

      // Create expense with base64 attachments
      const expense: Omit<Expense, 'id'> = {
        ...expenseData,
        attachments: attachmentsData,
      };

      await this.expenseModel.createExpense(expense);
      
      return { fileCount: files.length };
    });

    if (result) {
      const message = result.fileCount > 0 
        ? `Expense created successfully with ${result.fileCount} file(s)!`
        : 'Expense created successfully!';
      this.showSuccess(message);
      this.setSelectedFiles([]);
    }
  }

  async deleteExpense(id: number, title: string): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.expenseModel.deleteExpense(id)
    );

    if (result !== null) {
      this.showSuccess(`Expense "${title}" has been deleted successfully.`);
    }
  }

  async calculateStatistics(expenses: Expense[]): Promise<void> {
    const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    // Get budget from settings
    const { SettingsModel } = await import('../models/SettingsModel');
    const settingsModel = new SettingsModel();
    const budget = await settingsModel.getBudget();
    
    const remaining = budget - totalSpent;
    const percentageUsed = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
    const averageSpent = expenses.length > 0 ? totalSpent / expenses.length : 0;
    const amounts = expenses.map(e => Number(e.amount));
    const maxSpent = amounts.length > 0 ? Math.max(...amounts) : 0;
    const minSpent = amounts.length > 0 ? Math.min(...amounts) : 0;

    const statistics: ExpenseStatistics = {
      totalSpent,
      budget,
      remaining,
      percentageUsed: Number(percentageUsed.toFixed(1)),
      averageSpent,
      maxSpent,
      minSpent,
    };

    this.setStatistics(statistics);
  }

  parseAttachments(attachmentsJson?: string): AttachmentInfo[] {
    if (!attachmentsJson) return [];
    
    try {
      const attachments = JSON.parse(attachmentsJson);
      
      // Handle both old URL format and new base64 format
      if (Array.isArray(attachments)) {
        return attachments.map((attachment, index) => {
          if (typeof attachment === 'string') {
            // Old format: array of URLs
            return {
              url: attachment,
              fileName: `File ${index + 1}`,
            };
          } else if (attachment && typeof attachment === 'object' && attachment.base64) {
            // New format: array of objects with base64 data
            return {
              url: `data:${attachment.mimeType};base64,${attachment.base64}`,
              fileName: attachment.fileName || `File ${index + 1}`,
            };
          }
          return {
            url: '',
            fileName: `File ${index + 1}`,
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing attachments:', error);
      return [];
    }
  }

  formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR' 
    }).format(amount);
  }

  validateFileSize(file: File, maxSizeMB: number = 1): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async convertFilesToBase64(files: File[]): Promise<{ fileName: string; base64: string; mimeType: string }[]> {
    const results = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        base64: await this.convertFileToBase64(file),
        mimeType: file.type
      }))
    );
    return results;
  }

  validateExpenseData(expense: Partial<Expense>): string[] {
    const errors: string[] = [];
    
    if (!expense.title?.trim()) {
      errors.push('Title is required');
    }
    
    if (!expense.amount || expense.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!expense.datetime) {
      errors.push('Date and time is required');
    }
    
    if (!expense.labels?.trim()) {
      errors.push('Label is required');
    }
    
    if (!expense.category?.trim()) {
      errors.push('Category is required');
    }

    return errors;
  }
}
