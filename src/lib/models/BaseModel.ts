import type { ApiResponse, QueryResult, TursoResponse, TursoArg } from '../types';

export abstract class BaseModel {

  protected async executeQuery<T = any>(
    sql: string, 
    params: any[] = []
  ): Promise<T[]> {
    const tursoHost = this.getTursoHost();
    const tursoToken = this.getTursoToken();
    
    if (!tursoHost || !tursoToken) {
      throw new Error('Turso host and token must be configured in Settings');
    }
    
    const url = `${tursoHost}/v2/pipeline`;
    
    // Convert parameters to Turso format
    const args: TursoArg[] = params.map(param => {
      if (param === null || param === undefined) {
        return { type: 'null', value: null };
      } else if (typeof param === 'number') {
        if (Number.isInteger(param)) {
          return { type: 'integer', value: param.toString() };
        } else {
          return { type: 'float', value: param.toString() };
        }
      } else if (typeof param === 'string') {
        return { type: 'text', value: param };
      } else if (param instanceof Uint8Array) {
        return { type: 'blob', value: Array.from(param).map(b => b.toString(16).padStart(2, '0')).join('') };
      } else {
        return { type: 'text', value: String(param) };
      }
    });

    const requestBody = {
      requests: [
        { 
          type: 'execute', 
          stmt: { 
            sql, 
            args: args.length > 0 ? args : undefined
          } 
        },
        { type: 'close' }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Turso API request failed: ${response.status} ${response.statusText}`);
    }

    const result: TursoResponse = await response.json();
    
    // Extract results from Turso response format
    if (result.results && result.results.length > 0) {
      const executeResult = result.results[0];
      if (executeResult.type === 'ok' && executeResult.response?.type === 'execute') {
        const queryResult = executeResult.response.result;
        if (queryResult && queryResult.rows) {
          // Convert rows to objects using column names
          const cols = queryResult.cols;
          return queryResult.rows.map(row => {
            const obj: any = {};
            cols.forEach((col, index) => {
              const cellValue = row[index];
              // Convert Turso cell value to appropriate JavaScript type
              if (cellValue.type === 'null') {
                obj[col.name] = null;
              } else if (cellValue.type === 'integer') {
                obj[col.name] = parseInt(cellValue.value || '0', 10);
              } else if (cellValue.type === 'float') {
                obj[col.name] = parseFloat(cellValue.value || '0');
              } else if (cellValue.type === 'text') {
                obj[col.name] = cellValue.value || '';
              } else if (cellValue.type === 'blob') {
                // Handle blob data if needed
                obj[col.name] = cellValue.value;
              } else {
                obj[col.name] = cellValue.value;
              }
            });
            return obj;
          });
        }
      } else if (executeResult.type === 'error') {
        throw new Error(`Turso query error: ${executeResult.error?.message || 'Unknown error'}`);
      }
    }
    
    return [];
  }

  protected async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // This method is kept for backward compatibility but now uses Turso
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

  protected getTursoHost(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('turso_host') || '';
    }
    return '';
  }

  protected getTursoToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('turso_token') || '';
    }
    return '';
  }
}
