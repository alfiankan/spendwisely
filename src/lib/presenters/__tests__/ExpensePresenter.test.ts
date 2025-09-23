import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpensePresenter } from '../ExpensePresenter';
import { ExpenseModel } from '../../models/ExpenseModel';
import { FileModel } from '../../models/FileModel';
import type { Expense } from '../../types';

// Mock the models
vi.mock('../../models/ExpenseModel');
vi.mock('../../models/FileModel');
vi.mock('../../models/SettingsModel', () => ({
	SettingsModel: vi.fn().mockImplementation(() => ({
		getBudget: vi.fn().mockResolvedValue(1000000)
	}))
}));

describe('ExpensePresenter', () => {
	let presenter: ExpensePresenter;
	let mockExpenseModel: any;
	let mockFileModel: any;

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Create mock instances
		mockExpenseModel = {
			getAllExpenses: vi.fn(),
			createExpense: vi.fn(),
			deleteExpense: vi.fn(),
			getExpenseById: vi.fn()
		};

		mockFileModel = {
			uploadMultipleFiles: vi.fn()
		};

		// Mock the constructors
		(ExpenseModel as any).mockImplementation(() => mockExpenseModel);
		(FileModel as any).mockImplementation(() => mockFileModel);

		presenter = new ExpensePresenter();
	});

	describe('validateExpenseData', () => {
		it('should return no errors for valid expense data', () => {
			const validExpense: Partial<Expense> = {
				title: 'Test Expense',
				note: 'Test note',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(validExpense);
			expect(errors).toEqual([]);
		});

		it('should return error for missing title', () => {
			const invalidExpense: Partial<Expense> = {
				title: '',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Title is required');
		});

		it('should return error for whitespace-only title', () => {
			const invalidExpense: Partial<Expense> = {
				title: '   ',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Title is required');
		});

		it('should return error for zero amount', () => {
			const invalidExpense: Partial<Expense> = {
				title: 'Test Expense',
				amount: 0,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Amount must be greater than 0');
		});

		it('should return error for negative amount', () => {
			const invalidExpense: Partial<Expense> = {
				title: 'Test Expense',
				amount: -100,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Amount must be greater than 0');
		});

		it('should return error for missing datetime', () => {
			const invalidExpense: Partial<Expense> = {
				title: 'Test Expense',
				amount: 100000,
				datetime: '',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Date and time is required');
		});

		it('should return error for missing labels', () => {
			const invalidExpense: Partial<Expense> = {
				title: 'Test Expense',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: '',
				category: 'BASIC NEEDS'
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Label is required');
		});

		it('should return error for missing category', () => {
			const invalidExpense: Partial<Expense> = {
				title: 'Test Expense',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: ''
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toContain('Category is required');
		});

		it('should return multiple errors for multiple invalid fields', () => {
			const invalidExpense: Partial<Expense> = {
				title: '',
				amount: -100,
				datetime: '',
				labels: '',
				category: ''
			};

			const errors = presenter.validateExpenseData(invalidExpense);
			expect(errors).toHaveLength(5);
			expect(errors).toContain('Title is required');
			expect(errors).toContain('Amount must be greater than 0');
			expect(errors).toContain('Date and time is required');
			expect(errors).toContain('Label is required');
			expect(errors).toContain('Category is required');
		});
	});

	describe('validateFileSize', () => {
		it('should return true for file within size limit', () => {
			const file = new File(['test content'], 'test.txt', { size: 5 * 1024 * 1024 }); // 5MB
			const isValid = presenter.validateFileSize(file, 10);
			expect(isValid).toBe(true);
		});

		it('should return false for file exceeding size limit', () => {
			const file = new File(['test content'], 'test.txt', { size: 15 * 1024 * 1024 }); // 15MB
			const isValid = presenter.validateFileSize(file, 10);
			expect(isValid).toBe(false);
		});

		it('should use default 10MB limit when not specified', () => {
			const file = new File(['test content'], 'test.txt', { size: 5 * 1024 * 1024 }); // 5MB
			const isValid = presenter.validateFileSize(file);
			expect(isValid).toBe(true);
		});

		it('should return false for file at exact size limit', () => {
			const file = new File(['test content'], 'test.txt', { size: 10 * 1024 * 1024 }); // Exactly 10MB
			const isValid = presenter.validateFileSize(file, 10);
			expect(isValid).toBe(true);
		});
	});

	describe('formatRupiah', () => {
		it('should format amount in Indonesian Rupiah', () => {
			const formatted = presenter.formatRupiah(100000);
			expect(formatted).toBe('Rp100.000');
		});

		it('should format large amounts with proper separators', () => {
			const formatted = presenter.formatRupiah(1000000);
			expect(formatted).toBe('Rp1.000.000');
		});

		it('should format decimal amounts', () => {
			const formatted = presenter.formatRupiah(100000.50);
			expect(formatted).toBe('Rp100.000,50');
		});

		it('should format zero amount', () => {
			const formatted = presenter.formatRupiah(0);
			expect(formatted).toBe('Rp0');
		});
	});

	describe('parseAttachments', () => {
		it('should parse valid JSON attachments', () => {
			const attachmentsJson = '["https://example.com/file1.jpg", "https://example.com/file2.pdf"]';
			const attachments = presenter.parseAttachments(attachmentsJson);
			
			expect(attachments).toHaveLength(2);
			expect(attachments[0]).toEqual({
				url: 'https://example.com/file1.jpg',
				fileName: 'File 1'
			});
			expect(attachments[1]).toEqual({
				url: 'https://example.com/file2.pdf',
				fileName: 'File 2'
			});
		});

		it('should return empty array for undefined attachments', () => {
			const attachments = presenter.parseAttachments(undefined);
			expect(attachments).toEqual([]);
		});

		it('should return empty array for empty string', () => {
			const attachments = presenter.parseAttachments('');
			expect(attachments).toEqual([]);
		});

		it('should return empty array for invalid JSON', () => {
			const attachments = presenter.parseAttachments('invalid json');
			expect(attachments).toEqual([]);
		});

		it('should handle empty array JSON', () => {
			const attachments = presenter.parseAttachments('[]');
			expect(attachments).toEqual([]);
		});
	});

	describe('createExpense', () => {
		it('should create expense without files', async () => {
			const expenseData = {
				title: 'Test Expense',
				note: 'Test note',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			mockExpenseModel.createExpense.mockResolvedValue(undefined);

			await presenter.createExpense(expenseData, []);

			expect(mockExpenseModel.createExpense).toHaveBeenCalledWith({
				...expenseData,
				attachments: undefined
			});
		});

		it('should create expense with files', async () => {
			const expenseData = {
				title: 'Test Expense',
				note: 'Test note',
				amount: 100000,
				datetime: '2024-01-01T10:00:00',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS'
			};

			const files = [
				new File(['content1'], 'file1.jpg'),
				new File(['content2'], 'file2.pdf')
			];

			mockFileModel.uploadMultipleFiles.mockResolvedValue([
				{ url: 'https://example.com/file1.jpg', fileName: 'file1.jpg' },
				{ url: 'https://example.com/file2.pdf', fileName: 'file2.pdf' }
			]);
			mockExpenseModel.createExpense.mockResolvedValue(undefined);

			await presenter.createExpense(expenseData, files);

			expect(mockFileModel.uploadMultipleFiles).toHaveBeenCalledWith(files);
			expect(mockExpenseModel.createExpense).toHaveBeenCalledWith({
				...expenseData,
				attachments: JSON.stringify([
					'https://example.com/file1.jpg',
					'https://example.com/file2.pdf'
				])
			});
		});
	});
});

