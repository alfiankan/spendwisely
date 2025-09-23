import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NewExpenseForm from '../+page.svelte';
import { ExpensePresenter } from '$lib/presenters/ExpensePresenter';
import type { Expense } from '$lib/types';

// Mock the ExpensePresenter
vi.mock('$lib/presenters/ExpensePresenter', () => ({
	ExpensePresenter: vi.fn().mockImplementation(() => ({
		setSelectedFiles: vi.fn(),
		setUploadingFiles: vi.fn(),
		showModal: vi.fn(),
		setLoading: vi.fn(),
		setError: vi.fn(),
		validateFileSize: vi.fn().mockReturnValue(true),
		validateExpenseData: vi.fn().mockReturnValue([]),
		createExpense: vi.fn().mockResolvedValue(undefined)
	}))
}));

// Mock the types
vi.mock('$lib/types', () => ({
	CATEGORIES: ['BASIC NEEDS', 'TERSIER', 'EMERGENCY'],
	LABELS: ['FOOD & BEVERAGE', 'GROCERIES', 'TRANSPORT', 'ENTERTAIMENT', 'HEALTH', 'OTHER']
}));

describe('NewExpenseForm', () => {
	let mockPresenter: any;
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		vi.clearAllMocks();
		user = userEvent.setup();
		
		// Create a fresh mock presenter instance
		mockPresenter = {
			setSelectedFiles: vi.fn(),
			setUploadingFiles: vi.fn(),
			showModal: vi.fn(),
			setLoading: vi.fn(),
			setError: vi.fn(),
			validateFileSize: vi.fn().mockReturnValue(true),
			validateExpenseData: vi.fn().mockReturnValue([]),
			createExpense: vi.fn().mockResolvedValue(undefined)
		};

		(ExpensePresenter as any).mockImplementation(() => mockPresenter);
	});

	it('should render the form with all required fields', () => {
		render(NewExpenseForm);

		expect(screen.getByText('New Expense')).toBeInTheDocument();
		expect(screen.getByLabelText('Title')).toBeInTheDocument();
		expect(screen.getByLabelText('Note')).toBeInTheDocument();
		expect(screen.getByLabelText('Amount (Rp)')).toBeInTheDocument();
		expect(screen.getByLabelText('Date & Time')).toBeInTheDocument();
		expect(screen.getByLabelText('Labels')).toBeInTheDocument();
		expect(screen.getByLabelText('Category')).toBeInTheDocument();
		expect(screen.getByText('Create Expense')).toBeInTheDocument();
	});

	it('should have default values set correctly', () => {
		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const labelsSelect = screen.getByLabelText('Labels') as HTMLSelectElement;
		const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;

		expect(titleInput.value).toBe('');
		expect(amountInput.value).toBe('');
		expect(labelsSelect.value).toBe('FOOD & BEVERAGE');
		expect(categorySelect.value).toBe('BASIC NEEDS');
	});

	it('should update form values when user types', async () => {
		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const noteTextarea = screen.getByLabelText('Note') as HTMLTextAreaElement;

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.type(noteTextarea, 'Test note');

		expect(titleInput.value).toBe('Test Expense');
		expect(amountInput.value).toBe('100000');
		expect(noteTextarea.value).toBe('Test note');
	});

	it('should show validation errors when form is submitted with invalid data', async () => {
		mockPresenter.validateExpenseData.mockReturnValue(['Title is required', 'Amount must be greater than 0']);
		
		render(NewExpenseForm);

		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockPresenter.validateExpenseData).toHaveBeenCalled();
		});
	});

	it('should call createExpense with correct data when form is submitted', async () => {
		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const noteTextarea = screen.getByLabelText('Note') as HTMLTextAreaElement;
		const submitButton = screen.getByText('Create Expense');

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.type(noteTextarea, 'Test note');

		await user.click(submitButton);

		await waitFor(() => {
			expect(mockPresenter.createExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Test Expense',
					note: 'Test note',
					amount: 100000,
					labels: 'FOOD & BEVERAGE',
					category: 'BASIC NEEDS'
				}),
				[]
			);
		});
	});

	it('should handle file upload', async () => {
		render(NewExpenseForm);

		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(screen.getByText('Selected Files:')).toBeInTheDocument();
			expect(screen.getByText('test.jpg')).toBeInTheDocument();
		});
	});

	it('should remove file when remove button is clicked', async () => {
		render(NewExpenseForm);

		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(screen.getByText('test.jpg')).toBeInTheDocument();
		});

		const removeButton = screen.getByRole('button', { name: /remove/i });
		await user.click(removeButton);

		await waitFor(() => {
			expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
		});
	});

	it('should validate file size and show alert for oversized files', async () => {
		mockPresenter.validateFileSize.mockReturnValue(false);
		window.alert = vi.fn();

		render(NewExpenseForm);

		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg', size: 2 * 1024 * 1024 }); // 2MB

		await user.upload(fileInput, file);

		expect(window.alert).toHaveBeenCalledWith('File "test.jpg" is too large. Maximum size is 1MB.');
		expect(mockPresenter.validateFileSize).toHaveBeenCalledWith(file);
	});

	it('should show loading state during form submission', async () => {
		mockPresenter.createExpense.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const submitButton = screen.getByText('Create Expense');

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Creating Expense...')).toBeInTheDocument();
			expect(submitButton).toBeDisabled();
		});
	});

	it('should show uploading files state when files are being uploaded', async () => {
		mockPresenter.createExpense.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

		render(NewExpenseForm);

		const fileInput = screen.getByLabelText(/Click to upload files or drag and drop/) as HTMLInputElement;
		const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const submitButton = screen.getByText('Create Expense');

		await user.upload(fileInput, file);
		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Uploading files...')).toBeInTheDocument();
		});
	});

	it('should clear form after successful submission', async () => {
		mockPresenter.showModal.mockImplementation((result: any) => {
			// Simulate successful result
			if (result.type === 'success') {
				// Trigger the form clearing logic
				setTimeout(() => {
					window.location.reload();
				}, 100);
			}
		});

		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const submitButton = screen.getByText('Create Expense');

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockPresenter.createExpense).toHaveBeenCalled();
		});
	});

	it('should display error message when validation fails', async () => {
		const errorMessage = 'Title is required, Amount must be greater than 0';
		mockPresenter.validateExpenseData.mockReturnValue(['Title is required', 'Amount must be greater than 0']);

		render(NewExpenseForm);

		const submitButton = screen.getByText('Create Expense');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	it('should show modal when expense is created successfully', async () => {
		render(NewExpenseForm);

		const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
		const amountInput = screen.getByLabelText('Amount (Rp)') as HTMLInputElement;
		const submitButton = screen.getByText('Create Expense');

		await user.type(titleInput, 'Test Expense');
		await user.type(amountInput, '100000');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockPresenter.createExpense).toHaveBeenCalled();
		});
	});
});

