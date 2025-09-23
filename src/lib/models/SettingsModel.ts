import { BaseModel } from './BaseModel';
import type { Settings, SettingItem } from '../types';

export class SettingsModel extends BaseModel {
  async getAllSettings(): Promise<SettingItem[]> {
    const sql = `SELECT * FROM settings ORDER BY key`;
    const results = await this.executeQuery<SettingItem>(sql, []);
    return results;
  }

  async getSetting(key: string): Promise<string | null> {
    const sql = `SELECT value FROM settings WHERE key = ?`;
    const params = [key];

    const results = await this.executeQuery<{ value: string }>(sql, params);
    return results.length > 0 ? results[0].value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const sql = `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    const params = [key, value];

    await this.executeQuery(sql, params);
  }

  async getBudget(): Promise<number> {
    const budgetValue = await this.getSetting('budget');
    return budgetValue ? Number(budgetValue) : 0;
  }

  async setBudget(budget: number): Promise<void> {
    await this.setSetting('budget', budget.toString());
  }

  // Local storage methods for Turso configuration
  getTursoHost(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('turso_host') || '';
    }
    return '';
  }

  setTursoHost(host: string): void {
    if (typeof window !== 'undefined') {
      if (host.trim()) {
        localStorage.setItem('turso_host', host.trim());
      } else {
        localStorage.removeItem('turso_host');
      }
    }
  }

  getTursoToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('turso_token') || '';
    }
    return '';
  }

  setTursoToken(token: string): void {
    if (typeof window !== 'undefined') {
      if (token.trim()) {
        localStorage.setItem('turso_token', token.trim());
      } else {
        localStorage.removeItem('turso_token');
      }
    }
  }

  async loadAllSettings(): Promise<Settings> {
    const budget = await this.getBudget();
    const tursoHost = this.getTursoHost();
    const tursoToken = this.getTursoToken();

    return {
      budget,
      tursoHost,
      tursoToken,
    };
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    this.setTursoHost(settings.tursoHost);
    this.setTursoToken(settings.tursoToken);
    await this.setBudget(settings.budget);
  }
}
