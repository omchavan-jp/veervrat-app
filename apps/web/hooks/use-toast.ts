import { useCallback } from 'react';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    console.log(`[Toast] ${options.variant || 'default'}: ${options.title}`, options.description);
    // In a real app, this would dispatch to a toast provider
  }, []);

  return { toast };
}
