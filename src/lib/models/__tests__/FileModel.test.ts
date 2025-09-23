import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileModel } from '../FileModel';
import type { FileUploadResult } from '../../types';

// Mock the BaseModel
vi.mock('../BaseModel', () => ({
	BaseModel: vi.fn().mockImplementation(() => ({
		executeQuery: vi.fn()
	}))
}));

describe('FileModel', () => {
	let fileModel: FileModel;
	let mockExecuteQuery: any;

	beforeEach(() => {
		vi.clearAllMocks();
		
		mockExecuteQuery = vi.fn();
		fileModel = new FileModel();
		(fileModel as any).executeQuery = mockExecuteQuery;
	});

	describe('uploadFile', () => {
		it('should upload a single file successfully', async () => {
			const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
			const mockResponse = {
				success: true,
				result: {
					url: 'https://example.com/test.jpg',
					fileName: 'test.jpg'
				}
			};

			// Mock fetch
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await fileModel.uploadFile(mockFile);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/upload'),
				expect.objectContaining({
					method: 'POST',
					body: expect.any(FormData)
				})
			);

			expect(result).toEqual({
				url: 'https://example.com/test.jpg',
				fileName: 'test.jpg'
			});
		});

		it('should handle upload failure', async () => {
			const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request'
			});

			await expect(fileModel.uploadFile(mockFile)).rejects.toThrow('Upload failed: 400 Bad Request');
		});

		it('should handle network errors', async () => {
			const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(fileModel.uploadFile(mockFile)).rejects.toThrow('Network error');
		});
	});

	describe('uploadMultipleFiles', () => {
		it('should upload multiple files successfully', async () => {
			const mockFiles = [
				new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
				new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
			];

			const mockResponses = [
				{
					success: true,
					result: {
						url: 'https://example.com/file1.jpg',
						fileName: 'file1.jpg'
					}
				},
				{
					success: true,
					result: {
						url: 'https://example.com/file2.pdf',
						fileName: 'file2.pdf'
					}
				}
			];

			global.fetch = vi.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponses[0])
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponses[1])
				});

			const results = await fileModel.uploadMultipleFiles(mockFiles);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				url: 'https://example.com/file1.jpg',
				fileName: 'file1.jpg'
			});
			expect(results[1]).toEqual({
				url: 'https://example.com/file2.pdf',
				fileName: 'file2.pdf'
			});
		});

		it('should handle partial upload failures', async () => {
			const mockFiles = [
				new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
				new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
			];

			global.fetch = vi.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({
						success: true,
						result: {
							url: 'https://example.com/file1.jpg',
							fileName: 'file1.jpg'
						}
					})
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: 'Bad Request'
				});

			await expect(fileModel.uploadMultipleFiles(mockFiles)).rejects.toThrow('Upload failed: 400 Bad Request');
		});

		it('should return empty array for empty file list', async () => {
			const results = await fileModel.uploadMultipleFiles([]);
			expect(results).toEqual([]);
		});
	});

	describe('deleteFile', () => {
		it('should delete a file successfully', async () => {
			const fileUrl = 'https://example.com/test.jpg';
			mockExecuteQuery.mockResolvedValue(undefined);

			await fileModel.deleteFile(fileUrl);

			expect(mockExecuteQuery).toHaveBeenCalledWith(
				'DELETE FROM files WHERE url = ?',
				[fileUrl]
			);
		});

		it('should handle database errors during deletion', async () => {
			const fileUrl = 'https://example.com/test.jpg';
			mockExecuteQuery.mockRejectedValue(new Error('Database error'));

			await expect(fileModel.deleteFile(fileUrl)).rejects.toThrow('Database error');
		});
	});

	describe('getFileByUrl', () => {
		it('should retrieve file information by URL', async () => {
			const fileUrl = 'https://example.com/test.jpg';
			const mockFile = {
				id: 1,
				url: fileUrl,
				fileName: 'test.jpg',
				fileSize: 1024,
				uploadedAt: '2024-01-01T10:00:00Z'
			};

			mockExecuteQuery.mockResolvedValue([mockFile]);

			const result = await fileModel.getFileByUrl(fileUrl);

			expect(mockExecuteQuery).toHaveBeenCalledWith(
				'SELECT * FROM files WHERE url = ?',
				[fileUrl]
			);
			expect(result).toEqual(mockFile);
		});

		it('should return null when file is not found', async () => {
			const fileUrl = 'https://example.com/nonexistent.jpg';
			mockExecuteQuery.mockResolvedValue([]);

			const result = await fileModel.getFileByUrl(fileUrl);

			expect(result).toBeNull();
		});
	});

	describe('getAllFiles', () => {
		it('should retrieve all files', async () => {
			const mockFiles = [
				{
					id: 1,
					url: 'https://example.com/file1.jpg',
					fileName: 'file1.jpg',
					fileSize: 1024,
					uploadedAt: '2024-01-01T10:00:00Z'
				},
				{
					id: 2,
					url: 'https://example.com/file2.pdf',
					fileName: 'file2.pdf',
					fileSize: 2048,
					uploadedAt: '2024-01-01T11:00:00Z'
				}
			];

			mockExecuteQuery.mockResolvedValue(mockFiles);

			const result = await fileModel.getAllFiles();

			expect(mockExecuteQuery).toHaveBeenCalledWith(
				'SELECT * FROM files ORDER BY uploadedAt DESC'
			);
			expect(result).toEqual(mockFiles);
		});

		it('should return empty array when no files exist', async () => {
			mockExecuteQuery.mockResolvedValue([]);

			const result = await fileModel.getAllFiles();

			expect(result).toEqual([]);
		});
	});

	describe('validateFileType', () => {
		it('should validate allowed file types', () => {
			const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
			
			expect(fileModel.validateFileType('image/jpeg', allowedTypes)).toBe(true);
			expect(fileModel.validateFileType('image/png', allowedTypes)).toBe(true);
			expect(fileModel.validateFileType('application/pdf', allowedTypes)).toBe(true);
		});

		it('should reject disallowed file types', () => {
			const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
			
			expect(fileModel.validateFileType('text/plain', allowedTypes)).toBe(false);
			expect(fileModel.validateFileType('application/zip', allowedTypes)).toBe(false);
		});

		it('should handle empty allowed types array', () => {
			expect(fileModel.validateFileType('image/jpeg', [])).toBe(false);
		});
	});

	describe('formatFileSize', () => {
		it('should format file sizes correctly', () => {
			expect(fileModel.formatFileSize(1024)).toBe('1.0 KB');
			expect(fileModel.formatFileSize(1024 * 1024)).toBe('1.0 MB');
			expect(fileModel.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
			expect(fileModel.formatFileSize(1536)).toBe('1.5 KB');
			expect(fileModel.formatFileSize(1536 * 1024)).toBe('1.5 MB');
		});

		it('should handle zero size', () => {
			expect(fileModel.formatFileSize(0)).toBe('0 B');
		});

		it('should handle very small sizes', () => {
			expect(fileModel.formatFileSize(500)).toBe('500 B');
		});
	});
});

