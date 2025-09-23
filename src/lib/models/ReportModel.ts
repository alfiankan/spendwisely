import { BaseModel } from './BaseModel';
import type { ExpenseRecord, ExpenseSnapshot, ReportSummary, ReportFilters, Expense, Settings } from '../types';
import { SettingsModel } from './SettingsModel';

export class ReportModel extends BaseModel {
  async createReport(rangeLabel: string, startDate: string, endDate: string): Promise<number> {
    // Validate date range doesn't overlap with existing reports
    const overlapping = await this.checkDateOverlap(startDate, endDate);
    if (overlapping.length > 0) {
      throw new Error('Date range overlaps with existing report');
    }

    // Validate consecutive order
    const lastRecord = await this.getLastRecord();
    if (lastRecord && startDate !== this.getNextDay(lastRecord.record_end)) {
      throw new Error('Reports must be in consecutive order. Next start date should be ' + this.getNextDay(lastRecord.record_end));
    }

    const sql = `INSERT INTO expense_record (record_range_label, record_start, record_end) 
                 VALUES (?, ?, ?)`;
    const params = [rangeLabel, startDate, endDate];

    await this.executeQuery(sql, params);
    
    // Get the inserted record ID
    const result = await this.executeQuery(`SELECT last_insert_rowid() as id`);
    return result[0]?.id || 0;
  }

  async captureExpensesToReport(reportId: number): Promise<void> {
    // Get report details
    const report = await this.getReportById(reportId);
    if (!report) throw new Error('Report not found');

    // Get expenses in date range
    const expensesSql = `SELECT * FROM expenses WHERE date(datetime) BETWEEN DATE(?) AND DATE(?)`;
    const expenses = await this.executeQuery<Expense>(expensesSql, [report.record_start, report.record_end]);

    // Insert expenses into expenses_snapshot table
    for (const expense of expenses) {
      const insertSql = `INSERT INTO expenses_snapshot 
        (report_id, title, note, amount, datetime, labels, category, attachments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      await this.executeQuery(insertSql, [
        reportId,
        expense.title,
        expense.note,
        expense.amount,
        expense.datetime,
        expense.labels,
        expense.category,
        expense.attachments
      ]);
    }
  }

  async getAllReports(filters: ReportFilters): Promise<ExpenseRecord[]> {
    let sql = `SELECT id, record_range_label, record_start, record_end FROM expense_record`;
    
    sql += ` ORDER BY ${filters.sortBy} ${filters.sortOrder.toUpperCase()}`;

    return await this.executeQuery<ExpenseRecord>(sql, []);
  }

  async getReportById(id: number): Promise<ExpenseRecord | null> {
    const sql = `SELECT id, record_range_label, record_start, record_end FROM expense_record WHERE id = ?`;
    const results = await this.executeQuery<ExpenseRecord>(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  async getReportExpenses(reportId: number): Promise<ExpenseSnapshot[]> {
    const sql = `SELECT id, report_id, title, note, amount, datetime, labels, category, attachments 
                 FROM expenses_snapshot WHERE report_id = ? ORDER BY datetime DESC`;
    return await this.executeQuery<ExpenseSnapshot>(sql, [reportId]);
  }

  async getReportSummary(reportId: number): Promise<ReportSummary> {
    const report = await this.getReportById(reportId);
    if (!report) throw new Error('Report not found');

    const expenses = await this.getReportExpenses(reportId);
    
    // Get budget from settings
    const settingsModel = new SettingsModel();
    const settings = await settingsModel.getSettings();
    const totalBudget = settings.budget;
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = totalBudget - totalExpenses;
    const percentageUsed = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    // Group by category
    const expensesByCategory: { [category: string]: number } = {};
    expenses.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    });

    // Group by label
    const expensesByLabel: { [label: string]: number } = {};
    expenses.forEach(exp => {
      expensesByLabel[exp.labels] = (expensesByLabel[exp.labels] || 0) + exp.amount;
    });

    // Find max expense
    const maxExpense = expenses.reduce((max, exp) => 
      exp.amount > max.amount ? exp : max, 
      { amount: 0, title: '', datetime: '' }
    );

    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

    // Get previous report for comparison
    const previousReport = await this.getPreviousReport(report.record_start);
    let comparisonWithPrevious;
    if (previousReport) {
      const previousExpenses = await this.getReportExpenses(previousReport.id);
      const previousTotal = previousExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const difference = totalExpenses - previousTotal;
      const percentageChange = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;
      
      comparisonWithPrevious = {
        previousTotal,
        difference,
        percentageChange
      };
    }

    return {
      totalBudget,
      totalExpenses,
      remaining,
      percentageUsed,
      expensesByCategory,
      expensesByLabel,
      maxExpense,
      averageExpense,
      comparisonWithPrevious
    };
  }

  async deleteReport(id: number): Promise<void> {
    // Delete report expenses first
    await this.executeQuery(`DELETE FROM expenses_snapshot WHERE report_id = ?`, [id]);
    // Delete report
    await this.executeQuery(`DELETE FROM expense_record WHERE id = ?`, [id]);
  }

  private async checkDateOverlap(startDate: string, endDate: string): Promise<ExpenseRecord[]> {
    const sql = `SELECT * FROM expense_record 
                 WHERE (
                   (record_start <= ? AND record_end >= ?) OR
                   (record_start <= ? AND record_end >= ?) OR
                   (record_start >= ? AND record_end <= ?)
                 )`;
    return await this.executeQuery<ExpenseRecord>(sql, [
      startDate, startDate, endDate, endDate, startDate, endDate
    ]);
  }

  private async getPreviousReport(currentStartDate: string): Promise<ExpenseRecord | null> {
    const sql = `SELECT id, record_range_label, record_start, record_end 
                 FROM expense_record 
                 WHERE record_end < ? 
                 ORDER BY record_end DESC 
                 LIMIT 1`;
    const results = await this.executeQuery<ExpenseRecord>(sql, [currentStartDate]);
    return results.length > 0 ? results[0] : null;
  }

  private async getLastRecord(): Promise<ExpenseRecord | null> {
    const sql = `SELECT id, record_range_label, record_start, record_end 
                 FROM expense_record 
                 ORDER BY record_end DESC 
                 LIMIT 1`;
    const results = await this.executeQuery<ExpenseRecord>(sql, []);
    return results.length > 0 ? results[0] : null;
  }

  private getNextDay(dateString: string): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  async initializeTables(): Promise<void> {
    // Create expense_record table
    const createRecordTable = `
      CREATE TABLE IF NOT EXISTS expense_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_range_label TEXT NOT NULL,
        record_start TEXT NOT NULL,
        record_end TEXT NOT NULL
      )
    `;

    // Create expenses_snapshot table (immutable snapshot of expenses)
    const createSnapshotTable = `
      CREATE TABLE IF NOT EXISTS expenses_snapshot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        note TEXT,
        amount REAL NOT NULL,
        datetime TEXT NOT NULL,
        labels TEXT NOT NULL,
        category TEXT NOT NULL,
        attachments TEXT,
        FOREIGN KEY (report_id) REFERENCES expense_record (id) ON DELETE CASCADE
      )
    `;

    await this.executeQuery(createRecordTable);
    await this.executeQuery(createSnapshotTable);
  }
}