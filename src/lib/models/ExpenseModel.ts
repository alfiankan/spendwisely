import { BaseModel } from './BaseModel';
import type { Expense, ExpenseFilters, QueryResult } from '../types';

export class ExpenseModel extends BaseModel {
  async getAllExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    let sql = `SELECT * FROM expenses WHERE date(datetime) BETWEEN DATE(?) AND DATE(?)`;
    const params: any[] = [filters.startDate, filters.endDate];
    
    if (filters.label) {
      sql += ` AND labels = ?`;
      params.push(filters.label);
    }
    
    if (filters.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }
    
    sql += ` ORDER BY ${filters.sortBy} ${filters.sortOrder.toUpperCase()}`;

    const response = await this.makeRequest<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });

    // Handle different possible response structures
    let results: any[] = [];
    if (response.result?.[0]?.results) {
      results = response.result[0].results;
    } else if (response.results) {
      results = response.results;
    } else if (response.result) {
      results = response.result;
    } else if (Array.isArray(response)) {
      results = response;
    }

    return results as Expense[];
  }

  async createExpense(expense: Omit<Expense, 'id'>): Promise<void> {
    const sql = `INSERT INTO expenses (title, note, amount, datetime, labels, category, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      expense.title,
      expense.note,
      expense.amount,
      expense.datetime,
      expense.labels,
      expense.category,
      expense.attachments || null
    ];

    await this.makeRequest('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }

  async deleteExpense(id: number): Promise<void> {
    const sql = `DELETE FROM expenses WHERE id = ?`;
    const params = [id];

    await this.makeRequest('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }

  async getExpenseById(id: number): Promise<Expense | null> {
    const sql = `SELECT * FROM expenses WHERE id = ?`;
    const params = [id];

    const response = await this.makeRequest<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });

    let results: any[] = [];
    if (response.result?.[0]?.results) {
      results = response.result[0].results;
    } else if (response.results) {
      results = response.results;
    } else if (response.result) {
      results = response.result;
    }

    return results.length > 0 ? (results[0] as Expense) : null;
  }
}
