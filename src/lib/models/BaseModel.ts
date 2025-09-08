import type { ApiResponse, QueryResult } from '../types';

export abstract class BaseModel {
  protected async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = this.getApiUrl();
    const apiUrl = `${baseUrl}${endpoint}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  protected getApiUrl(): string {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('d1_proxy_url');
      if (storedUrl && storedUrl.trim()) {
        return storedUrl.trim();
      }
    }
    throw new Error('Worker URL not configured. Please set your worker URL in Settings.');
  }

  protected getToken(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('d1_token');
      return token && token.trim() ? token.trim() : null;
    }
    return null;
  }
}
