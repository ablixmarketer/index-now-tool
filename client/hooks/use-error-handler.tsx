import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface ErrorState {
  error: string | null;
  isLoading: boolean;
}

export function useErrorHandler() {
  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
    }
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const handleAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      
      if (options?.loadingMessage) {
        toast({
          title: "Loading",
          description: options.loadingMessage
        });
      }

      const result = await operation();
      
      if (options?.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
          variant: "default"
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : options?.errorMessage || 'An unexpected error occurred';
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, clearError]);

  return {
    error: state.error,
    isLoading: state.isLoading,
    setError,
    setLoading,
    clearError,
    handleAsync
  };
}
