import React, { useEffect, useState } from 'react';
import { useArticles, useAuth, useWebSocket, useLocalStorageBackup, useErrorHandler } from '../hooks';
import { ArticleTabBar } from './ArticleTabBar';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { QRCodeModal } from './QRCodeModal';
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
  const { loadBackups, clearBackups, getBackupTimestamp } = useLocalStorageBackup(articles);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
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
      return;
    }

    const timeoutId = setTimeout(async () => {
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
          console.log('Auto-saved:', activeArticle.title);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
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
    
    // Show QR modal only when creating the first article
    if (articles.length === 0) {
      setShowQRModal(true);
    }
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

  const handleTabSave = React.useCallback(async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    let filePath = article.filePath;

    // If no file path, use browser's save dialog
    if (!filePath) {
      try {
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
          // Use modern File System Access API
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `${article.title || 'Untitled'}.md`,
            types: [
              {
                description: 'Markdown Files',
                accept: { 'text/markdown': ['.md'] },
              },
            ],
          });
          
          // Write content to the selected file
          const writable = await handle.createWritable();
          await writable.write(article.content);
          await writable.close();
          
          // Store the file handle for future saves
          filePath = handle.name;
          updateArticlePath(article.id, filePath);
          updateArticleTitle(article.id, handle.name.replace(/\.md$/, ''));
          markArticleSaved(article.id);
          
          console.log('Saved:', handle.name);
          return; // Exit early, file already saved via File System Access API
        } else {
          // Fallback: prompt for filename and save to server
          const fileName = prompt('Enter filename (without extension):', article.title);
          if (!fileName) return; // User cancelled
          
          // Save to 'articles' directory in project root
          filePath = `articles/${fileName}.md`;
          
          // Update article with new file path and title
          updateArticlePath(article.id, filePath);
          updateArticleTitle(article.id, fileName);
        }
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name === 'AbortError') {
          console.log('Save cancelled by user');
          return;
        }
        console.error('Error showing save dialog:', error);
        
        // Fallback to prompt
        const fileName = prompt('Enter filename (without extension):', article.title);
        if (!fileName) return;
        
        filePath = `articles/${fileName}.md`;
        updateArticlePath(article.id, filePath);
        updateArticleTitle(article.id, fileName);
      }
    }

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
        console.log('Saved:', article.title);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save file. Please try again.');
    }
  }, [articles, updateArticlePath, updateArticleTitle, markArticleSaved]);

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
        
        if (activeArticleId) {
          console.log('Save shortcut triggered for article:', activeArticleId);
          handleTabSave(activeArticleId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeArticleId, handleTabSave]);

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
            <button onClick={() => setShowGallery(!showGallery)} className="btn-secondary">
              S3 Images
            </button>
          </div>
        </div>
        <div className="header-right">
          <NetworkStatusIndicator />
          <button onClick={onOpenSettings} className="btn-secondary">
            Settings
          </button>
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
          {/* Small QR button - non-intrusive */}
          <button 
            className="qr-toggle-btn"
            onClick={() => setShowQRModal(true)}
            title="Show QR Code for mobile connection"
          >
            QR Code
          </button>

          {activeArticle && (
            <div className="preview-section">
              <h3>Preview</h3>
              <MarkdownPreview content={activeArticle.content} />
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          authState={{
            qrCode: authState.qrCodeDataURL,
            tokenExpiresAt: authState.tokenExpiresAt,
          }}
          onRegenerate={regenerateQRCode}
        />
      </div>

      {/* S3 Images Modal */}
      {showGallery && (
        <div className="gallery-overlay" onClick={() => setShowGallery(false)}>
          <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-close" onClick={() => setShowGallery(false)} aria-label="Close">
              ×
            </button>
            <h2 className="gallery-title">S3 Images</h2>
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
