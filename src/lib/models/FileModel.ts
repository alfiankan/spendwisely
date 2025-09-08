import { BaseModel } from './BaseModel';
import type { FileUploadResult } from '../types';

export class FileModel extends BaseModel {
  async uploadFile(file: File): Promise<FileUploadResult> {
    const baseUrl = this.getApiUrl();
    const apiUrl = `${baseUrl}/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // Worker returns { key, message }, construct the URL
    const fileUrl = `${baseUrl}/object/${result.key}`;
    
    return {
      url: fileUrl,
      fileName: result.key,
    };
  }

  async getPresignedUrl(fileKey: string): Promise<string> {
    const baseUrl = this.getApiUrl();
    const apiUrl = `${baseUrl}/presign?key=${encodeURIComponent(fileKey)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.url;
  }

  async uploadMultipleFiles(files: File[]): Promise<FileUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }
}
