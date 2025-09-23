import { describe, it, expect, vi } from 'vitest';
import { ExpensePresenter } from '$lib/presenters/ExpensePresenter';

// Mock the dependencies
vi.mock('$lib/models/ExpenseModel');
vi.mock('$lib/models/FileModel');

describe('Base64 Conversion', () => {
  let presenter: ExpensePresenter;

  beforeEach(() => {
    presenter = new ExpensePresenter();
  });

  it('should convert file to base64', async () => {
    // Create a mock file
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: 'data:text/plain;base64,dGVzdCBjb250ZW50'
    };

    // Mock global FileReader
    global.FileReader = vi.fn(() => mockFileReader) as any;

    const base64Promise = presenter.convertFileToBase64(mockFile);
    
    // Simulate successful read
    mockFileReader.onload!({} as any);
    
    const base64 = await base64Promise;
    expect(base64).toBe('dGVzdCBjb250ZW50');
  });

  it('should validate file size correctly', () => {
    const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
    Object.defineProperty(smallFile, 'size', { value: 500 * 1024 }); // 500KB

    const largeFile = new File(['large'], 'large.txt', { type: 'text/plain' });
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB

    expect(presenter.validateFileSize(smallFile)).toBe(true);
    expect(presenter.validateFileSize(largeFile)).toBe(false);
  });

  it('should parse base64 attachments correctly', () => {
    const base64Attachments = JSON.stringify([
      {
        fileName: 'receipt.jpg',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        mimeType: 'image/jpeg'
      }
    ]);

    const parsed = presenter.parseAttachments(base64Attachments);
    
    expect(parsed).toHaveLength(1);
    expect(parsed[0].fileName).toBe('receipt.jpg');
    expect(parsed[0].url).toContain('data:image/jpeg;base64,');
  });

  it('should handle legacy URL attachments', () => {
    const urlAttachments = JSON.stringify([
      'https://example.com/file1.jpg',
      'https://example.com/file2.pdf'
    ]);

    const parsed = presenter.parseAttachments(urlAttachments);
    
    expect(parsed).toHaveLength(2);
    expect(parsed[0].url).toBe('https://example.com/file1.jpg');
    expect(parsed[0].fileName).toBe('File 1');
    expect(parsed[1].url).toBe('https://example.com/file2.pdf');
    expect(parsed[1].fileName).toBe('File 2');
  });
});
