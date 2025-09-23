import type { ModalResult } from '../types';

export abstract class BasePresenter {
  public showModal: (result: ModalResult) => void = () => {};
  public setLoading: (loading: boolean) => void = () => {};
  public setError: (error: string) => void = () => {};

  protected showSuccess(message: string): void {
    this.showModal({ type: 'success', message });
  }

  protected showError(message: string): void {
    this.showModal({ type: 'error', message });
  }

  protected async executeWithLoading<T>(
    operation: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T | null> {
    try {
      this.setLoading(true);
      if (loadingMessage) {
        this.setError(loadingMessage);
      }
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      this.setError(errorMessage);
      this.showError(errorMessage);
      return null;
    } finally {
      this.setLoading(false);
    }
  }
}
