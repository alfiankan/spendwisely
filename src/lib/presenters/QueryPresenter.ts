import { BasePresenter } from './BasePresenter';
import { QueryModel } from '../models/QueryModel';
import type { QueryExecutionResult, SavedQuery, ChartData } from '../types';

export class QueryPresenter extends BasePresenter {
  private queryModel: QueryModel;

  constructor() {
    super();
    this.queryModel = new QueryModel();
  }

  // State setters (to be injected by the view)
  setQueryResult: (result: QueryExecutionResult | null) => void = () => {};
  setSavedQueries: (queries: SavedQuery[]) => void = () => {};
  setChartData: (data: ChartData | null) => void = () => {};

  async executeQuery(sql: string, params: unknown[] = []): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.queryModel.executeQuery(sql, params),
    );

    if (result) {
      this.setQueryResult(result);
      // Don't auto-generate chart data - let user configure it manually
    }
  }

  async loadSavedQueries(): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.queryModel.getSavedQueries(),
    );

    if (result) {
      this.setSavedQueries(result);
    }
  }

  async saveQuery(name: string, query: string): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.queryModel.saveQuery(name, query)
    );

    if (result !== null) {
      this.showSuccess('Query saved successfully!');
      await this.loadSavedQueries();
    }
  }

  async deleteSavedQuery(id: number): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.queryModel.deleteSavedQuery(id)
    );

    if (result !== null) {
      this.showSuccess('Query deleted successfully!');
      await this.loadSavedQueries();
    }
  }

  private generateChartData(queryResult: QueryExecutionResult): void {
    if (!queryResult.results || queryResult.results.length === 0) {
      this.setChartData(null);
      return;
    }

    // Try to generate chart data from the first two columns
    const firstRow = queryResult.results[0];
    const columns = Object.keys(firstRow);
    
    if (columns.length < 2) {
      this.setChartData(null);
      return;
    }

    const labelColumn = columns[0];
    const dataColumn = columns[1];

    // Check if data column contains numeric values
    const isNumeric = queryResult.results.every(row => 
      !isNaN(Number(row[dataColumn]))
    );

    if (!isNumeric) {
      this.setChartData(null);
      return;
    }

    const chartData: ChartData = {
      labels: queryResult.results.map(row => String(row[labelColumn])),
      datasets: [{
        label: dataColumn,
        data: queryResult.results.map(row => Number(row[dataColumn])),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
      }],
    };

    this.setChartData(chartData);
  }

  validateQuery(sql: string): string[] {
    const errors: string[] = [];
    
    if (!sql.trim()) {
      errors.push('Query cannot be empty');
    }
    
    // Basic SQL injection prevention
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
    const upperSql = sql.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperSql.includes(keyword)) {
        errors.push(`Use of '${keyword}' keyword is not allowed for security reasons`);
        break;
      }
    }

    return errors;
  }

  formatExecutionTime(time: number): string {
    if (time < 1000) {
      return `${time.toFixed(2)}ms`;
    } else {
      return `${(time / 1000).toFixed(2)}s`;
    }
  }
}
