import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, useWebSocket } from '../hooks';
import './MobileUploadLayout.css';

// Import sub-components (defined below)
import { ArticleSelector } from './ArticleSelector';
import { ImageUploader } from './ImageUploader';

interface Article {
  id: string;
  title: string;
}

export function MobileUploadLayout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, authenticateWithQRToken, error: authError } = useAuth();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);

  // WebSocket connection for receiving article list
  const { isConnected } = useWebSocket(
    {
      url: window.location.origin,
      sessionToken: null, // Will use cookie
      autoConnect: isAuthenticated,
    },
    {
      onConnect: () => {
        console.log('WebSocket connected');
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      onArticleList: (data) => {
        console.log('Received article list via WebSocket:', data.articles);
        setArticles(data.articles);
      },
      onArticleUpdate: (data) => {
        console.log('Article updated:', data);
        // Update specific article in the list
        setArticles(prev => 
          prev.map(article => 
            article.id === data.articleId 
              ? { ...article, title: data.title }
              : article
          )
        );
      },
    }
  );

  // Handle QR token authentication on mount
  useEffect(() => {
    const qrToken = searchParams.get('token');
    
    if (qrToken && !isAuthenticated && !isAuthenticating) {
      console.log('[Mobile] Authenticating with QR token:', qrToken);
      setIsAuthenticating(true);
      setAuthenticationError(null);
      
      authenticateWithQRToken(qrToken)
        .then(() => {
          console.log('[Mobile] Authentication successful');
          // Remove token from URL after successful authentication
          navigate('/mobile', { replace: true });
        })
        .catch((error) => {
          console.error('[Mobile] Authentication failed:', error);
          setAuthenticationError(error.message || 'Authentication failed');
        })
        .finally(() => {
          setIsAuthenticating(false);
        });
    }
  }, [searchParams, isAuthenticated, isAuthenticating, authenticateWithQRToken, navigate]);

  // Fetch article list from server after authentication
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Mobile] Fetching article list, isConnected:', isConnected);
      fetchArticleList();
    }
  }, [isAuthenticated]);

  const fetchArticleList = async () => {
    try {
      console.log('[Mobile] Fetching articles from:', `${window.location.origin}/api/articles`);
      const response = await fetch(`${window.location.origin}/api/articles`, {
        credentials: 'include',
      });

      console.log('[Mobile] Article list response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.error('[Mobile] Session expired');
          setAuthenticationError('Session expired. Please scan the QR code again.');
          return;
        }
        throw new Error('Failed to fetch article list');
      }

      const data = await response.json();
      console.log('[Mobile] Received articles:', data);
      setArticles(data.articles || []);
    } catch (error) {
      console.error('[Mobile] Failed to fetch articles:', error);
    }
  };

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticleId(articleId);
  };

  const handleUploadSuccess = () => {
    // Optionally refresh article list or show success message
    console.log('Upload successful');
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  // Show authentication loading
  if (isAuthenticating) {
    return (
      <div className="mobile-upload-layout">
        <div className="mobile-auth-loading">
          <div className="spinner"></div>
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show authentication error
  if (authenticationError || authError) {
    return (
      <div className="mobile-upload-layout">
        <div className="mobile-auth-error">
          <div className="error-icon">⚠️</div>
          <h2>Authentication Failed</h2>
          <p>{authenticationError || authError}</p>
          <div className="error-instructions">
            <p>Please scan the QR code from your PC again to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show not authenticated message
  if (!isAuthenticated) {
    return (
      <div className="mobile-upload-layout">
        <div className="mobile-not-authenticated">
          <div className="info-icon">🔒</div>
          <h2>Authentication Required</h2>
          <p>Please scan the QR code displayed on your PC to access the mobile upload interface.</p>
        </div>
      </div>
    );
  }

  // Show no articles message
  if (articles.length === 0) {
    return (
      <div className="mobile-upload-layout">
        <header className="mobile-header">
          <h1>📱 Blog Image Upload</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </header>
        
        <div className="mobile-no-articles">
          <div className="info-icon">📝</div>
          <h2>No Articles Open</h2>
          <p>Please open an article on your PC to start uploading images.</p>
        </div>
      </div>
    );
  }

  // Main authenticated view
  return (
    <div className="mobile-upload-layout">
      <header className="mobile-header">
        <h1>📱 Blog Image Upload</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <main className="mobile-content">
        <ArticleSelector
          articles={articles}
          selectedArticleId={selectedArticleId}
          onSelect={handleArticleSelect}
        />

        <ImageUploader
          selectedArticleId={selectedArticleId}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </main>
    </div>
  );
}
