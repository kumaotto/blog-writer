import { useState, useEffect, useCallback } from 'react';
import { ErrorHandler, AppError, ErrorType } from '../utils/ErrorHandler';

export interface ErrorNotification {
  id: string;
  message: string;
  type: ErrorType;
  timestamp: Date;
}

export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    // Subscribe to global error events
    const unsubscribe = ErrorHandler.addListener((error: AppError) => {
      const notification: ErrorNotification = {
        id: `${Date.now()}-${Math.random()}`,
        message: error.userMessage,
        type: error.type,
        timestamp: new Date(),
      };

      setErrors(prev => [...prev, notification]);

      // Auto-dismiss after 5 seconds for non-critical errors
      if (error.type !== ErrorType.AUTHENTICATION) {
        setTimeout(() => {
          dismissError(notification.id);
        }, 5000);
      }
    });

    return unsubscribe;
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors(prev => prev.filter(err => err.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    dismissError,
    clearAllErrors,
  };
}
