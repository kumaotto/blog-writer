import { useEffect, useCallback } from 'react';
import { Article } from '../types';

const BACKUP_KEY_PREFIX = 'blog-assistant-backup-';
const BACKUP_TIMESTAMP_KEY = 'blog-assistant-backup-timestamp';

export function useLocalStorageBackup(articles: Article[]) {
  // Save articles to localStorage
  const saveBackup = useCallback(() => {
    try {
      articles.forEach(article => {
        const backupKey = `${BACKUP_KEY_PREFIX}${article.id}`;
        localStorage.setItem(backupKey, JSON.stringify({
          id: article.id,
          title: article.title,
          filePath: article.filePath,
          content: article.content,
          cursorPosition: article.cursorPosition,
          lastModified: article.lastModified,
        }));
      });
      
      // Save timestamp
      localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save backup:', error);
    }
  }, [articles]);

  // Load backups from localStorage
  const loadBackups = useCallback((): Article[] => {
    try {
      const backups: Article[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            const article = JSON.parse(data);
            backups.push({
              ...article,
              isDirty: true, // Mark as dirty since it's from backup
              lastModified: new Date(article.lastModified),
            });
          }
        }
      }
      
      return backups;
    } catch (error) {
      console.error('Failed to load backups:', error);
      return [];
    }
  }, []);

  // Clear all backups
  const clearBackups = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem(BACKUP_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Failed to clear backups:', error);
    }
  }, []);

  // Clear backup for specific article
  const clearArticleBackup = useCallback((articleId: string) => {
    try {
      const backupKey = `${BACKUP_KEY_PREFIX}${articleId}`;
      localStorage.removeItem(backupKey);
    } catch (error) {
      console.error('Failed to clear article backup:', error);
    }
  }, []);

  // Get backup timestamp
  const getBackupTimestamp = useCallback((): Date | null => {
    try {
      const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Failed to get backup timestamp:', error);
      return null;
    }
  }, []);

  // Auto-save to localStorage when articles change
  useEffect(() => {
    if (articles.length > 0) {
      const timeoutId = setTimeout(() => {
        saveBackup();
      }, 1000); // Debounce 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [articles, saveBackup]);

  // Cleanup old backups when articles are saved
  useEffect(() => {
    articles.forEach(article => {
      if (!article.isDirty) {
        clearArticleBackup(article.id);
      }
    });
  }, [articles, clearArticleBackup]);

  return {
    saveBackup,
    loadBackups,
    clearBackups,
    clearArticleBackup,
    getBackupTimestamp,
  };
}
