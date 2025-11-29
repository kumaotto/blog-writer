import React from 'react';
import { Article } from '../types';
import './ArticleTabBar.css';

interface ArticleTabBarProps {
  articles: Article[];
  activeArticleId: string | null;
  onTabClick: (articleId: string) => void;
  onTabClose: (articleId: string) => void;
  onNewTab: () => void;
}

export const ArticleTabBar: React.FC<ArticleTabBarProps> = ({
  articles,
  activeArticleId,
  onTabClick,
  onTabClose,
  onNewTab,
}) => {
  const handleTabClose = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const article = articles.find(a => a.id === articleId);
    
    // Show confirmation dialog if article has unsaved changes
    if (article?.isDirty) {
      const confirmed = window.confirm(
        `"${article.title}" has unsaved changes. Do you want to close it?`
      );
      if (!confirmed) return;
    }
    
    onTabClose(articleId);
  };

  const truncateTitle = (title: string, maxLength: number = 20): string => {
    if (!title || title === 'Untitled') return 'Untitled';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div className="article-tab-bar">
      <div className="tabs-container">
        {articles.map(article => (
          <div
            key={article.id}
            className={`article-tab ${article.id === activeArticleId ? 'active' : ''} ${article.isDirty ? 'dirty' : ''}`}
            onClick={() => onTabClick(article.id)}
            role="tab"
            aria-selected={article.id === activeArticleId}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTabClick(article.id);
              }
            }}
          >
            <span className="tab-title">
              {truncateTitle(article.title)}
              {article.isDirty && <span className="dirty-indicator" title="Unsaved changes">●</span>}
            </span>
            <button
              className="tab-close-btn"
              onClick={(e) => handleTabClose(e, article.id)}
              title="Close tab"
              aria-label={`Close ${article.title || 'Untitled'}`}
            >
              ×
            </button>
          </div>
        ))}
        <button 
          className="new-tab-btn" 
          onClick={onNewTab}
          title="New article"
          aria-label="Create new article"
        >
          +
        </button>
      </div>
    </div>
  );
};
