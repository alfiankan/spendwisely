import { BaseModel } from './BaseModel';
import type { Expense, ExpenseFilters } from '../types';

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

    const results = await this.executeQuery<Expense>(sql, params);
    return results;
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

    await this.executeQuery(sql, params);
  }

  async deleteExpense(id: number): Promise<void> {
    const sql = `DELETE FROM expenses WHERE id = ?`;
    const params = [id];

    await this.executeQuery(sql, params);
  }

  async getExpenseById(id: number): Promise<Expense | null> {
    const sql = `SELECT * FROM expenses WHERE id = ?`;
    const params = [id];

    const results = await this.executeQuery<Expense>(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}
