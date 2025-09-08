import { BaseModel } from './BaseModel';
import type { QueryExecutionResult, SavedQuery, QueryResult } from '../types';

export class QueryModel extends BaseModel {
  async executeQuery(sql: string, params: unknown[] = []): Promise<QueryExecutionResult> {
    const startTime = performance.now();
    
    const response = await this.makeRequest<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Handle different possible response structures
    let results: any[] = [];
    if (response.result && Array.isArray(response.result) && response.result[0]?.results) {
      results = response.result[0].results;
    } else if (response.results) {
      results = response.results;
    } else if (response.result && Array.isArray(response.result)) {
      results = response.result;
    } else if (Array.isArray(response)) {
      results = response;
    }

    return {
      results,
      executionTime,
      rowCount: results.length,
    };
  }

  async getSavedQueries(): Promise<SavedQuery[]> {
    const sql = `SELECT * FROM saved_queries ORDER BY created_at DESC`;
    const result = await this.executeQuery(sql);
    return result.results as SavedQuery[];
  }

  async saveQuery(name: string, query: string): Promise<void> {
    const sql = `INSERT INTO saved_queries (name, query) VALUES (?, ?)`;
    await this.executeQuery(sql, [name, query]);
  }

  async deleteSavedQuery(id: number): Promise<void> {
    const sql = `DELETE FROM saved_queries WHERE id = ?`;
    await this.executeQuery(sql, [id]);
  }
}
