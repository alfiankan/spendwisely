import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NewExpenseForm from '../../routes/new-expenses/+page.svelte';
import { ExpensePresenter } from '$lib/presenters/ExpensePresenter';
import { ExpenseModel } from '$lib/models/ExpenseModel';
import { FileModel } from '$lib/models/FileModel';
import type { Expense } from '$lib/types';

// Mock the models
vi.mock('$lib/models/ExpenseModel');
vi.mock('$lib/models/FileModel');
vi.mock('$lib/models/SettingsModel', () => ({
	SettingsModel: vi.fn().mockImplementation(() => ({
		getBudget: vi.fn().mockResolvedValue(1000000)
	}))
}));

describe('Expense Creation Integration Test', () => {
	let mockExpenseModel: any;
	let mockFileModel: any;
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		vi.clearAllMocks();
		user = userEvent.setup();

		// Create mock instances
		mockExpenseModel = {
			getAllExpenses: vi.fn(),
			createExpense: vi.fn().mockResolvedValue(undefined),
			deleteExpense: vi.fn(),
			getExpenseById: vi.fn()
		};

		mockFileModel = {
			uploadMultipleFiles: vi.fn().mockResolvedValue([
				{ url: 'https://example.com/receipt1.jpg', fileName: 'receipt1.jpg' },
				{ url: 'https://example.com/receipt2.pdf', fileName: 'receipt2.pdf' }
			])
		};

		// Mock the constructors
		(ExpenseModel as any).mockImplementation(() => mockExpenseModel);
		(FileModel as any).mockImplementation(() => mockFileModel);

		// Mock window.alert
		window.alert = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should complete the full expense creation flow with files', async () => {
		render(NewExpenseForm);

		// Fill out the form
		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const noteTextarea = screen.getByLabelText('Note') as HTMLTextAreaElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const datetimeInput = screen.getByLabelText('Date & Time') as HTMLInputElement;
		const labelsSelect = screen.getByLabelText('Labels') as HTMLSelectElement;
		const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;

		await user.type(titleInput, 'Lunch at Restaurant');
		await user.type(noteTextarea, 'Business lunch with client');
		await user.type(amountInput, '150000');
		await user.clear(datetimeInput);
		await user.type(datetimeInput, '2024-01-15T12:30');
		await user.selectOptions(labelsSelect, 'FOOD & BEVERAGE');
		await user.selectOptions(categorySelect, 'BASIC NEEDS');

		// Upload files
		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file1 = new File(['receipt content 1'], 'receipt1.jpg', { type: 'image/jpeg' });
		const file2 = new File(['receipt content 2'], 'receipt2.pdf', { type: 'application/pdf' });

		await user.upload(fileInput, [file1, file2]);

		// Verify files are displayed
		await waitFor(() => {
			expect(screen.getByText('receipt1.jpg')).toBeInTheDocument();
			expect(screen.getByText('receipt2.pdf')).toBeInTheDocument();
		});

		// Submit the form
		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		// Verify the loading state
		await waitFor(() => {
			expect(screen.getByText('Uploading files...')).toBeInTheDocument();
		});

		// Wait for the expense creation to complete
		await waitFor(() => {
			expect(mockFileModel.uploadMultipleFiles).toHaveBeenCalledWith([file1, file2]);
		});

		await waitFor(() => {
			expect(mockExpenseModel.createExpense).toHaveBeenCalledWith({
				title: 'Lunch at Restaurant',
				note: 'Business lunch with client',
				amount: 150000,
				datetime: '2024-01-15T12:30',
				labels: 'FOOD & BEVERAGE',
				category: 'BASIC NEEDS',
				attachments: JSON.stringify([
					'https://example.com/receipt1.jpg',
					'https://example.com/receipt2.pdf'
				])
			});
		});
	});

	it('should handle expense creation without files', async () => {
		render(NewExpenseForm);

		// Fill out the form
		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;

		await user.type(titleInput, 'Coffee');
		await user.type(amountInput, '25000');

		// Submit the form
		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		// Wait for the expense creation to complete
		await waitFor(() => {
			expect(mockExpenseModel.createExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Coffee',
					amount: 25000,
					attachments: undefined
				})
			);
		});

		// Verify no file upload was attempted
		expect(mockFileModel.uploadMultipleFiles).not.toHaveBeenCalled();
	});

	it('should handle file upload errors gracefully', async () => {
		// Mock file upload failure
		mockFileModel.uploadMultipleFiles.mockRejectedValue(new Error('Upload failed'));

		render(NewExpenseForm);

		// Fill out the form
		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');

		// Upload a file
		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
		await user.upload(fileInput, file);

		// Submit the form
		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		// The form should handle the error gracefully
		await waitFor(() => {
			expect(mockFileModel.uploadMultipleFiles).toHaveBeenCalled();
		});
	});

	it('should validate form data before submission', async () => {
		render(NewExpenseForm);

		// Try to submit empty form
		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		// Should show validation errors
		await waitFor(() => {
			expect(screen.getByText(/Title is required/)).toBeInTheDocument();
		});

		// Verify no API calls were made
		expect(mockExpenseModel.createExpense).not.toHaveBeenCalled();
		expect(mockFileModel.uploadMultipleFiles).not.toHaveBeenCalled();
	});

	it('should handle file size validation', async () => {
		render(NewExpenseForm);

		// Create a large file (15MB)
		const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.jpg', { 
			type: 'image/jpeg',
			size: 15 * 1024 * 1024 
		});

		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		await user.upload(fileInput, largeFile);

		// Should show alert for oversized file
		expect(window.alert).toHaveBeenCalledWith('File "large.jpg" is too large. Maximum size is 10MB.');

		// File should not be added to the list
		expect(screen.queryByText('large.jpg')).not.toBeInTheDocument();
	});

	it('should allow removing files before submission', async () => {
		render(NewExpenseForm);

		// Upload files
		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file1 = new File(['content1'], 'file1.jpg', { type: 'image/jpeg' });
		const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });

		await user.upload(fileInput, [file1, file2]);

		// Verify both files are displayed
		await waitFor(() => {
			expect(screen.getByText('file1.jpg')).toBeInTheDocument();
			expect(screen.getByText('file2.pdf')).toBeInTheDocument();
		});

		// Remove one file
		const removeButtons = screen.getAllByRole('button', { name: /remove/i });
		await user.click(removeButtons[0]);

		// Verify only one file remains
		await waitFor(() => {
			expect(screen.queryByText('file1.jpg')).not.toBeInTheDocument();
			expect(screen.getByText('file2.pdf')).toBeInTheDocument();
		});

		// Fill out and submit form
		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');

		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		// Should only upload the remaining file
		await waitFor(() => {
			expect(mockFileModel.uploadMultipleFiles).toHaveBeenCalledWith([file2]);
		});
	});

	it('should format currency correctly in the UI', async () => {
		render(NewExpenseForm);

		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		await user.type(amountInput, '1000000');

		// The input should accept the value
		expect(amountInput.value).toBe('1000000');
	});

	it('should handle different expense categories and labels', async () => {
		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const labelsSelect = screen.getByLabelText('Labels') as HTMLSelectElement;
		const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;

		await user.type(titleInput, 'Emergency Medical');
		await user.type(amountInput, '500000');
		await user.selectOptions(labelsSelect, 'HEALTH');
		await user.selectOptions(categorySelect, 'EMERGENCY');

		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockExpenseModel.createExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Emergency Medical',
					amount: 500000,
					labels: 'HEALTH',
					category: 'EMERGENCY'
				})
			);
		});
	});
});

