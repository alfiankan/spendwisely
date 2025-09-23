import { describe, it, expect } from 'vitest';

// Test OCR utility functions
describe('OCR Functionality', () => {
  // Test file validation
  function validateImageFile(file: File): { isValid: boolean; error?: string } {
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Please select an image file (JPG, PNG, GIF, etc.)' };
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 10MB' };
    }
    
    return { isValid: true };
  }

  it('should validate image files correctly', () => {
    // Mock image file
    const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(imageFile, 'size', { value: 1024 * 1024 }); // 1MB

    const result = validateImageFile(imageFile);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject non-image files', () => {
    const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    const result = validateImageFile(pdfFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please select an image file (JPG, PNG, GIF, etc.)');
  });

  it('should reject oversized files', () => {
    const largeFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB

    const result = validateImageFile(largeFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File size must be less than 10MB');
  });

  it('should accept various image formats', () => {
    const formats = [
      { type: 'image/jpeg', name: 'test.jpg' },
      { type: 'image/png', name: 'test.png' },
      { type: 'image/gif', name: 'test.gif' },
      { type: 'image/bmp', name: 'test.bmp' },
      { type: 'image/webp', name: 'test.webp' }
    ];

    formats.forEach(format => {
      const file = new File(['test'], format.name, { type: format.type });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  // Test text processing utilities
  function getTextStats(text: string) {
    const characterCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const lineCount = text.split('\n').filter(line => line.trim().length > 0).length;
    
    return { characterCount, wordCount, lineCount };
  }

  it('should calculate text statistics correctly', () => {
    const text = 'Hello world!\nThis is a test.\nMultiple lines here.';
    const stats = getTextStats(text);
    
    expect(stats.characterCount).toBe(47);
    expect(stats.wordCount).toBe(8);
    expect(stats.lineCount).toBe(3);
  });

  it('should handle empty text', () => {
    const stats = getTextStats('');
    expect(stats.characterCount).toBe(0);
    expect(stats.wordCount).toBe(0);
    expect(stats.lineCount).toBe(0);
  });

  it('should handle text with extra whitespace', () => {
    const text = '  Hello   world  \n  \n  Another line  ';
    const stats = getTextStats(text);
    
    expect(stats.characterCount).toBe(35);
    expect(stats.wordCount).toBe(4); // "Hello", "world", "Another", "line"
    expect(stats.lineCount).toBe(2); // Only non-empty lines
  });
});
