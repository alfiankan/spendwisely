import { BaseModel } from './BaseModel';
import type { QueryExecutionResult, SavedQuery } from '../types';

export class QueryModel extends BaseModel {
  async executeQuery(sql: string, params: unknown[] = []): Promise<QueryExecutionResult> {
    const startTime = performance.now();
    
    const results = await super.executeQuery<any>(sql, params);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

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
