import { useState, useCallback, useEffect } from 'react';
import { AuthState } from '../types';

const API_BASE_URL = window.location.origin;

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    sessionToken: null,
    qrCodeDataURL: null,
    tokenExpiresAt: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session token from cookie on mount
  useEffect(() => {
    const token = getSessionTokenFromCookie();
    if (token) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        sessionToken: token,
      }));
    }
  }, []);

  // Generate QR code for PC editor
  const generateQRCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/qr-code`);
      
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      const { qrCodeDataURL } = data;

      setAuthState(prev => ({
        ...prev,
        qrCodeDataURL,
      }));

      return qrCodeDataURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Regenerate QR code
  const regenerateQRCode = useCallback(async () => {
    return generateQRCode();
  }, [generateQRCode]);

  // Authenticate with QR token (for mobile)
  const authenticateWithQRToken = useCallback(async (qrToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrToken }),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error('Invalid or expired QR token');
      }

      const data = await response.json();
      const { sessionToken, expiresAt } = data;

      setAuthState({
        isAuthenticated: true,
        sessionToken,
        qrCodeDataURL: null,
        tokenExpiresAt: new Date(expiresAt),
      });

      return sessionToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout (clear session)
  const logout = useCallback(() => {
    // Clear cookie
    document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    setAuthState({
      isAuthenticated: false,
      sessionToken: null,
      qrCodeDataURL: null,
      tokenExpiresAt: null,
    });
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (!authState.tokenExpiresAt) {
      return false;
    }
    return new Date() > authState.tokenExpiresAt;
  }, [authState.tokenExpiresAt]);

  return {
    authState,
    isLoading,
    error,
    isAuthenticated: authState.isAuthenticated && !isTokenExpired(),
    generateQRCode,
    regenerateQRCode,
    authenticateWithQRToken,
    logout,
    isTokenExpired,
  };
}

// Helper function to get session token from cookie
function getSessionTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sessionToken') {
      return value;
    }
  }
  return null;
}
