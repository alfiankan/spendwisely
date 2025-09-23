import { describe, it, expect } from 'vitest';

// Test the image file detection logic
describe('Image Preview Functionality', () => {
  function isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  it('should correctly identify image files', () => {
    expect(isImageFile('receipt.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('image.png')).toBe(true);
    expect(isImageFile('picture.gif')).toBe(true);
    expect(isImageFile('banner.bmp')).toBe(true);
    expect(isImageFile('logo.webp')).toBe(true);
    expect(isImageFile('RECEIPT.JPG')).toBe(true); // Case insensitive
    expect(isImageFile('photo.JPEG')).toBe(true);
  });

  it('should correctly identify non-image files', () => {
    expect(isImageFile('document.pdf')).toBe(false);
    expect(isImageFile('spreadsheet.xlsx')).toBe(false);
    expect(isImageFile('text.txt')).toBe(false);
    expect(isImageFile('archive.zip')).toBe(false);
    expect(isImageFile('video.mp4')).toBe(false);
    expect(isImageFile('audio.mp3')).toBe(false);
  });

  it('should handle files without extensions', () => {
    expect(isImageFile('file')).toBe(false);
    expect(isImageFile('README')).toBe(false);
  });

  it('should handle files with multiple dots', () => {
    expect(isImageFile('my.receipt.jpg')).toBe(true);
    expect(isImageFile('backup.2023.pdf')).toBe(false);
  });
});
