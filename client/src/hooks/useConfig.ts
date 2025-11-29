import { useState, useEffect, useCallback } from 'react';
import { AWSCredentials } from '../types';

const API_BASE_URL = window.location.origin;

interface ConfigState {
  exists: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useConfig() {
  const [configState, setConfigState] = useState<ConfigState>({
    exists: false,
    isLoading: true,
    error: null,
  });

  // Check if config exists on mount
  useEffect(() => {
    checkConfigExists();
  }, []);

  const checkConfigExists = useCallback(async () => {
    setConfigState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/config/exists`);
      
      if (!response.ok) {
        throw new Error('Failed to check configuration');
      }

      const data = await response.json();
      
      setConfigState({
        exists: data.exists,
        isLoading: false,
        error: null,
      });

      return data.exists;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setConfigState({
        exists: false,
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  }, []);

  const saveConfig = useCallback(async (credentials: AWSCredentials) => {
    setConfigState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Save credentials
      const saveResponse = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save configuration');
      }

      // Test S3 connection
      const testResponse = await fetch(`${API_BASE_URL}/api/config/test`);
      const testData = await testResponse.json();

      if (!testResponse.ok || !testData.success) {
        throw new Error(testData.error || 'S3 connection test failed');
      }

      setConfigState({
        exists: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setConfigState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  const deleteAllData = useCallback(async () => {
    setConfigState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      setConfigState({
        exists: false,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete configuration';
      setConfigState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  return {
    configExists: configState.exists,
    isLoading: configState.isLoading,
    error: configState.error,
    checkConfigExists,
    saveConfig,
    deleteAllData,
  };
}
