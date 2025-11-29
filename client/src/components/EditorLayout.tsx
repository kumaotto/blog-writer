import React, { useEffect, useState } from 'react';
import { useArticles, useAuth, useWebSocket, useLocalStorageBackup, useErrorHandler } from '../hooks';
import { ArticleTabBar } from './ArticleTabBar';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ImageGallery } from './ImageGallery';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';
import { ErrorNotification } from './ErrorNotification';
import './EditorLayout.css';

interface EditorLayoutProps {
  onOpenSettings?: () => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({ onOpenSettings }) => {
  const {
    articles,
    activeArticleId,
    addArticle,
    removeArticle,
    setActiveArticle,
    updateArticleContent,
    updateArticleCursor,
    markArticleSaved,
    updateArticleTitle,
    updateArticlePath,
  } = useArticles();
  
  const { errors, dismissError } = useErrorHandler();

  const { authState, generateQRCode, regenerateQRCode } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { loadBackups, clearBackups, getBackupTimestamp } = useLocalStorageBackup(articles);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  
  // Memoize WebSocket callbacks to prevent reconnection loops
  const handleWebSocketConnect = React.useCallback(() => {
    console.log('WebSocket connected - sending article list');
  }, []);

  const handleImageInsert = React.useCallback((data: { articleId: string; imageUrl: string }) => {
    if (data.articleId) {
      const article = articles.find(a => a.id === data.articleId);
      if (article) {
        const newContent = 
          article.content.slice(0, article.cursorPosition) +
          `![](${data.imageUrl})` +
          article.content.slice(article.cursorPosition);
        updateArticleContent(data.articleId, newContent);
      }
    }
  }, [articles, updateArticleContent]);

  // Memoize events object to prevent WebSocket reconnection loops
  const webSocketEvents = React.useMemo(() => ({
    onConnect: handleWebSocketConnect,
    onImageInsert: handleImageInsert,
  }), [handleWebSocketConnect, handleImageInsert]);

  const { status: wsStatus, sendArticleList } = useWebSocket(
    { url: window.location.origin, autoConnect: true },
    webSocketEvents
  );

  // Generate QR code on mount
  useEffect(() => {
    generateQRCode().catch(console.error);
  }, []);

  // Send article list via WebSocket and API when articles change (for mobile access)
  useEffect(() => {
    const articleList = articles.map(article => ({
      id: article.id,
      title: article.title,
    }));

    // Send via WebSocket if connected
    if (wsStatus === 'connected') {
      sendArticleList(articleList);
    }

    // Also send to backend API for mobile to fetch
    fetch(`${window.location.origin}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ articles: articleList }),
    }).catch(error => {
      console.error('Failed to update article list on server:', error);
    });
  }, [articles, wsStatus, sendArticleList]);

  // Check for backups on mount
  useEffect(() => {
    const backupTimestamp = getBackupTimestamp();
    if (backupTimestamp && articles.length === 0) {
      const timeDiff = Date.now() - backupTimestamp.getTime();
      // Show restore prompt if backup is less than 24 hours old
      if (timeDiff < 24 * 60 * 60 * 1000) {
        setShowRestorePrompt(true);
      } else {
        // Clear old backups
        clearBackups();
      }
    }
  }, []); // Only run on mount

  // Warn before closing browser if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = articles.some(article => article.isDirty);
      
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [articles]);

  const handleRestoreBackups = () => {
    const backups = loadBackups();
    backups.forEach(backup => {
      addArticle(backup);
    });
    setShowRestorePrompt(false);
  };

  const handleDiscardBackups = () => {
    clearBackups();
    setShowRestorePrompt(false);
  };

  // Auto-save functionality with 5 second debounce
  useEffect(() => {
    if (!activeArticleId) return;

    const activeArticle = articles.find(a => a.id === activeArticleId);
    if (!activeArticle || !activeArticle.isDirty || !activeArticle.filePath) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('idle');

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: activeArticle.filePath,
            content: activeArticle.content,
          }),
        });

        if (response.ok) {
          markArticleSaved(activeArticleId);
          setSaveStatus('saved');
          console.log('Auto-saved:', activeArticle.title);
          
          // Reset to idle after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('idle');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('idle');
      }
    }, 5000); // 5 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [activeArticleId, articles, markArticleSaved]);

  const handleNewTab = () => {
    const newArticle = {
      title: 'Untitled',
      filePath: '',
      content: '',
      cursorPosition: 0,
    };
    addArticle(newArticle);
  };

  const handleOpenFile = async () => {
    try {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          // Read file content using FileReader
          const reader = new FileReader();
          reader.onload = async (event) => {
            const content = event.target?.result as string;
            
            // Extract filename without extension
            const fileName = file.name.replace(/\.(md|markdown|txt)$/i, '');
            
            // Create new article with file content
            const newArticle = {
              title: fileName,
              filePath: file.name, // Store filename (will be updated on save)
              content: content,
              cursorPosition: 0,
            };
            
            addArticle(newArticle);
          };
          
          reader.onerror = () => {
            console.error('Failed to read file');
            alert('Failed to read file. Please try again.');
          };
          
          reader.readAsText(file);
        } catch (error) {
          console.error('Error opening file:', error);
          alert('Failed to open file. Please try again.');
        }
      };
      
      // Trigger file selection dialog
      input.click();
    } catch (error) {
      console.error('Error in file open dialog:', error);
      alert('Failed to open file dialog. Please try again.');
    }
  };

  const handleTabClose = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    
    // Check if article has unsaved changes
    if (article?.isDirty) {
      const confirmed = window.confirm(
        `"${article.title}" has unsaved changes. Do you want to close it anyway?`
      );
      if (!confirmed) {
        return;
      }
    }
    
    removeArticle(articleId);
  };

  const handleTabClick = (articleId: string) => {
    setActiveArticle(articleId);
  };

  const handleSaveFile = async () => {
    if (!activeArticleId) return;
    
    const article = articles.find(a => a.id === activeArticleId);
    if (!article) return;

    let filePath = article.filePath;

    // If no file path, prompt user for save location
    if (!filePath) {
      const fileName = prompt('Enter filename (without extension):', article.title);
      if (!fileName) return; // User cancelled
      
      filePath = `${fileName}.md`;
      
      // Update article with new file path and title
      updateArticlePath(article.id, filePath);
      updateArticleTitle(article.id, fileName);
    }

    // Save file
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: filePath,
          content: article.content,
        }),
      });

      if (response.ok) {
        markArticleSaved(article.id);
        setSaveStatus('saved');
        console.log('Saved:', article.title);
        
        // Show success notification
        alert(`File saved successfully: ${filePath}`);
        
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save file. Please try again.');
      setSaveStatus('idle');
    }
  };

  const handleCopyMarkdown = async () => {
    if (!activeArticleId) return;
    
    const article = articles.find(a => a.id === activeArticleId);
    if (!article) return;

    try {
      await navigator.clipboard.writeText(article.content);
      alert('Markdown copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleExportForWordPress = async () => {
    if (!activeArticleId) return;
    
    const article = articles.find(a => a.id === activeArticleId);
    if (!article) return;

    try {
      // Jetpack Markdown is compatible with standard markdown
      // Just ensure proper formatting for WordPress
      const exportContent = article.content;
      
      await navigator.clipboard.writeText(exportContent);
      alert('Markdown exported to clipboard! Ready to paste into WordPress (Jetpack Markdown).');
    } catch (error) {
      console.error('Failed to export markdown:', error);
      alert('Failed to export to clipboard. Please try again.');
    }
  };

  const activeArticle = articles.find(a => a.id === activeArticleId);

  return (
    <div className="editor-layout">
      {/* Restore Backup Prompt */}
      {showRestorePrompt && (
        <div className="restore-prompt-overlay">
          <div className="restore-prompt">
            <h3>Restore from Backup?</h3>
            <p>
              We found unsaved changes from a previous session. 
              Would you like to restore them?
            </p>
            <div className="restore-prompt-actions">
              <button 
                onClick={handleRestoreBackups}
                className="btn-primary"
              >
                Restore
              </button>
              <button 
                onClick={handleDiscardBackups}
                className="btn-secondary"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="editor-header">
        <div className="header-left">
          <h1>Blog Writing Assistant</h1>
          <div className="header-actions">
            <button onClick={handleNewTab} className="btn-secondary">
              New Article
            </button>
            <button onClick={handleOpenFile} className="btn-secondary">
              Open File
            </button>
            <button 
              onClick={handleSaveFile} 
              className="btn-primary"
              disabled={!activeArticleId || !articles.find(a => a.id === activeArticleId)?.isDirty}
            >
              Save
            </button>
            <button 
              onClick={handleCopyMarkdown}
              className="btn-secondary"
              disabled={!activeArticleId}
              title="Copy markdown to clipboard"
            >
              Copy Markdown
            </button>
            <button 
              onClick={handleExportForWordPress}
              className="btn-secondary"
              disabled={!activeArticleId}
              title="Export for WordPress (Jetpack Markdown)"
            >
              Export to WordPress
            </button>
            <button onClick={onOpenSettings} className="btn-secondary">
              Settings
            </button>
            <button onClick={() => setShowGallery(!showGallery)} className="btn-secondary">
              {showGallery ? 'Hide Gallery' : 'Show Gallery'}
            </button>
          </div>
        </div>
        <div className="header-right">
          <NetworkStatusIndicator />
          {saveStatus === 'saving' && <span className="save-status">Saving...</span>}
          {saveStatus === 'saved' && <span className="save-status saved">Saved</span>}
        </div>
      </div>

      {/* Article Tabs */}
      <ArticleTabBar
        articles={articles}
        activeArticleId={activeArticleId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />

      {/* Main Content */}
      <div className="editor-content">
        {/* Left Panel - Editor */}
        <div className="editor-panel">
          {activeArticle ? (
            <MarkdownEditor
              articleId={activeArticle.id}
              content={activeArticle.content}
              onChange={(content) => updateArticleContent(activeArticle.id, content)}
              onCursorChange={(position) => updateArticleCursor(activeArticle.id, position)}
              onMultipleImageDrop={async (files) => {
                // Handle multiple image drops with parallel upload (max 3 concurrent)
                const maxConcurrent = 3;
                const uploadPromises: Promise<void>[] = [];
                
                for (let i = 0; i < files.length; i += maxConcurrent) {
                  const batch = files.slice(i, i + maxConcurrent);
                  const batchPromises = batch.map(async (file) => {
                    try {
                      // Compress image if needed (>2MB)
                      let processedFile = file;
                      if (file.size > 2 * 1024 * 1024) {
                        const { compressImageIfNeeded } = await import('../utils/imageCompression');
                        processedFile = await compressImageIfNeeded(file, 2, 0.8);
                      }

                      // Upload image to S3
                      const formData = new FormData();
                      formData.append('image', processedFile);

                      const response = await fetch('/api/images/upload', {
                        method: 'POST',
                        body: formData,
                      });

                      if (!response.ok) {
                        throw new Error(`Failed to upload ${file.name}`);
                      }

                      const data = await response.json();
                      
                      // Insert markdown image tag at cursor position
                      const imageMarkdown = `![${file.name}](${data.url})\n`;
                      const newContent = 
                        activeArticle.content.slice(0, activeArticle.cursorPosition) +
                        imageMarkdown +
                        activeArticle.content.slice(activeArticle.cursorPosition);
                      
                      updateArticleContent(activeArticle.id, newContent);
                      updateArticleCursor(activeArticle.id, activeArticle.cursorPosition + imageMarkdown.length);
                    } catch (error) {
                      console.error(`Image upload failed for ${file.name}:`, error);
                    }
                  });
                  
                  uploadPromises.push(...batchPromises);
                  // Wait for current batch to complete before starting next batch
                  await Promise.all(batchPromises);
                }
                
                // Show completion message
                const successCount = files.length;
                alert(`Successfully uploaded ${successCount} image(s)`);
              }}
              onSave={async () => {
                if (!activeArticle.filePath) {
                  alert('Please set a file path before saving');
                  return;
                }

                try {
                  const response = await fetch('/api/files', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      filePath: activeArticle.filePath,
                      content: activeArticle.content,
                    }),
                  });

                  if (response.ok) {
                    markArticleSaved(activeArticle.id);
                    console.log('Saved:', activeArticle.title);
                  } else {
                    throw new Error('Save failed');
                  }
                } catch (error) {
                  console.error('Save failed:', error);
                  alert('Failed to save file. Please try again.');
                }
              }}
              onImageDrop={async (file) => {
                try {
                  // Compress image if needed (>2MB)
                  let processedFile = file;
                  if (file.size > 2 * 1024 * 1024) {
                    const { compressImageIfNeeded } = await import('../utils/imageCompression');
                    processedFile = await compressImageIfNeeded(file, 2, 0.8);
                    console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
                  }

                  // Upload image to S3
                  const formData = new FormData();
                  formData.append('image', processedFile);

                  const response = await fetch('/api/images/upload', {
                    method: 'POST',
                    body: formData,
                  });

                  if (!response.ok) {
                    throw new Error('Failed to upload image');
                  }

                  const data = await response.json();
                  
                  // Insert markdown image tag at cursor position
                  const imageMarkdown = `![${file.name}](${data.url})`;
                  const newContent = 
                    activeArticle.content.slice(0, activeArticle.cursorPosition) +
                    imageMarkdown +
                    activeArticle.content.slice(activeArticle.cursorPosition);
                  
                  updateArticleContent(activeArticle.id, newContent);
                  updateArticleCursor(activeArticle.id, activeArticle.cursorPosition + imageMarkdown.length);
                } catch (error) {
                  console.error('Image upload failed:', error);
                  alert('Failed to upload image. Please try again.');
                }
              }}
            />
          ) : (
            <div className="empty-state">
              <p>No article selected. Create a new article or open an existing file to get started.</p>
            </div>
          )}
        </div>

        {/* Right Panel - Preview & QR Code */}
        <div className="preview-panel">
          <div className="qr-section">
            <QRCodeDisplay
              qrCodeDataURL={authState.qrCodeDataURL}
              onRegenerate={regenerateQRCode}
            />
            <div className="ws-status">
              WebSocket: <span className={`status-${wsStatus}`}>{wsStatus}</span>
            </div>
          </div>

          {activeArticle && (
            <div className="preview-section">
              <h3>Preview</h3>
              <MarkdownPreview content={activeArticle.content} />
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <div className="gallery-overlay" onClick={() => setShowGallery(false)}>
          <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
            <ImageGallery />
          </div>
        </div>
      )}

      {/* Error Notifications */}
      <div className="error-notifications">
        {errors.map(error => (
          <ErrorNotification
            key={error.id}
            id={error.id}
            message={error.message}
            type={error.type}
            onDismiss={dismissError}
          />
        ))}
      </div>
    </div>
  );
};
