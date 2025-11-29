import { useState, useEffect, useCallback } from 'react';
import { ErrorHandler, AppError, ErrorType } from '../utils/ErrorHandler';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOnlineAt: Date | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isReconnecting: false,
    lastOnlineAt: navigator.onLine ? new Date() : null,
  });

  const handleOnline = useCallback(() => {
    console.log('Network: Online');
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      isReconnecting: false,
      lastOnlineAt: new Date(),
    }));

    // Notify user that connection is restored
    const notification = document.createElement('div');
    notification.textContent = '✓ Connection restored';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }, []);

  const handleOffline = useCallback(() => {
    console.log('Network: Offline');
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      isReconnecting: false,
    }));

    // Notify user about offline status
    const error = new AppError(
      'Network connection lost',
      ErrorType.NETWORK,
      true,
      'You are offline. Please check your internet connection.'
    );
    ErrorHandler.handle(error, 'Network Status');
  }, []);

  useEffect(() => {
    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (every 30 seconds)
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource to verify actual connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch('/api/health', {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If we were offline and now we can reach the server, update status
        if (!status.isOnline) {
          handleOnline();
        }
      } catch (error) {
        // If we were online and now we can't reach the server, update status
        if (status.isOnline && navigator.onLine) {
          console.warn('Server unreachable despite online status');
        }
      }
    };

    const intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, status.isOnline]);

  const startReconnecting = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isReconnecting: true,
    }));
  }, []);

  const stopReconnecting = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isReconnecting: false,
    }));
  }, []);

  return {
    ...status,
    startReconnecting,
    stopReconnecting,
  };
}
