import type { ModalResult } from '../types';

export abstract class BasePresenter {
  protected showModal: (result: ModalResult) => void = () => {};
  protected setLoading: (loading: boolean) => void = () => {};
  protected setError: (error: string) => void = () => {};

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
