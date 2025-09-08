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
      
      // Upload files if any
      let attachmentUrls: string[] = [];
      if (files.length > 0) {
        const uploadResults = await this.fileModel.uploadMultipleFiles(files);
        attachmentUrls = uploadResults.map(result => result.url);
      }

      // Create expense with attachments
      const expense: Omit<Expense, 'id'> = {
        ...expenseData,
        attachments: attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : undefined,
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
      const urls: string[] = JSON.parse(attachmentsJson);
      return urls.map((url, index) => ({
        url,
        fileName: `File ${index + 1}`,
      }));
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

  validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
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
