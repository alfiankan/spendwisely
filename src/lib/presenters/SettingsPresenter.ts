import { BasePresenter } from './BasePresenter';
import { SettingsModel } from '../models/SettingsModel';
import type { Settings, SettingItem } from '../types';

export class SettingsPresenter extends BasePresenter {
  private settingsModel: SettingsModel;

  constructor() {
    super();
    this.settingsModel = new SettingsModel();
  }

  // State setters (to be injected by the view)
  setSettings: (settings: Settings) => void = () => {};
  setSettingsList: (settings: SettingItem[]) => void = () => {};

  async loadSettings(): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.settingsModel.loadAllSettings(),
    );

    if (result) {
      this.setSettings(result);
      await this.loadSettingsList();
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    const result = await this.executeWithLoading(
      () => this.settingsModel.saveAllSettings(settings),
    );

    if (result !== null) {
      this.showSuccess('Settings have been saved successfully!');
      await this.loadSettings();
    }
  }

  private async loadSettingsList(): Promise<void> {
    try {
      const dbSettings = await this.settingsModel.getAllSettings();
      const currentSettings = await this.settingsModel.loadAllSettings();
      
      // Combine database settings with local storage settings
      const allSettings: SettingItem[] = [...dbSettings];
      
      if (currentSettings.d1ProxyUrl) {
        allSettings.push({ 
          key: 'd1_proxy_url', 
          value: currentSettings.d1ProxyUrl 
        });
      }
      
      if (currentSettings.d1Token) {
        allSettings.push({ 
          key: 'd1_token', 
          value: '••••••••' 
        });
      }

      this.setSettingsList(allSettings);
    } catch (error) {
      console.error('Error loading settings list:', error);
    }
  }

  formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  validateSettings(settings: Partial<Settings>): string[] {
    const errors: string[] = [];
    
    if (settings.budget !== undefined && settings.budget < 0) {
      errors.push('Budget must be a positive number');
    }
    
    if (settings.d1ProxyUrl && !this.isValidUrl(settings.d1ProxyUrl)) {
      errors.push('D1 Proxy URL must be a valid URL');
    }

    return errors;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
