import { BaseModel } from './BaseModel';
import type { Settings, SettingItem, QueryResult } from '../types';

export class SettingsModel extends BaseModel {
  async getAllSettings(): Promise<SettingItem[]> {
    const sql = `SELECT * FROM settings ORDER BY key`;
    const response = await this.makeRequest<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params: [] }),
    });

    let results: any[] = [];
    if (response.result && Array.isArray(response.result) && response.result[0]?.results) {
      results = response.result[0].results;
    } else if (response.results) {
      results = response.results;
    } else if (response.result && Array.isArray(response.result)) {
      results = response.result;
    }

    return results as SettingItem[];
  }

  async getSetting(key: string): Promise<string | null> {
    const sql = `SELECT value FROM settings WHERE key = ?`;
    const params = [key];

    const response = await this.makeRequest<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });

    let results: any[] = [];
    if (response.result && Array.isArray(response.result) && response.result[0]?.results) {
      results = response.result[0].results;
    } else if (response.results) {
      results = response.results;
    } else if (response.result && Array.isArray(response.result)) {
      results = response.result;
    }

    return results.length > 0 ? results[0].value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const sql = `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    const params = [key, value];

    await this.makeRequest('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }

  async getBudget(): Promise<number> {
    const budgetValue = await this.getSetting('budget');
    return budgetValue ? Number(budgetValue) : 0;
  }

  async setBudget(budget: number): Promise<void> {
    await this.setSetting('budget', budget.toString());
  }

  // Local storage methods for D1 configuration
  getD1ProxyUrl(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('d1_proxy_url') || '';
    }
    return '';
  }

  setD1ProxyUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (url.trim()) {
        localStorage.setItem('d1_proxy_url', url.trim());
      } else {
        localStorage.removeItem('d1_proxy_url');
      }
    }
  }

  getD1Token(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('d1_token') || '';
    }
    return '';
  }

  setD1Token(token: string): void {
    if (typeof window !== 'undefined') {
      if (token.trim()) {
        localStorage.setItem('d1_token', token.trim());
      } else {
        localStorage.removeItem('d1_token');
      }
    }
  }

  async loadAllSettings(): Promise<Settings> {
    const budget = await this.getBudget();
    const d1ProxyUrl = this.getD1ProxyUrl();
    const d1Token = this.getD1Token();

    return {
      budget,
      d1ProxyUrl,
      d1Token,
    };
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    this.setD1ProxyUrl(settings.d1ProxyUrl);
    this.setD1Token(settings.d1Token);
    await this.setBudget(settings.budget);

  }
}
