import { useState } from 'react';
import './ArticleSelector.css';

interface Article {
  id: string;
  title: string;
}

interface ArticleSelectorProps {
  articles: Article[];
  selectedArticleId: string | null;
  onSelect: (articleId: string) => void;
}

export function ArticleSelector({ articles, selectedArticleId, onSelect }: ArticleSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedArticle = articles.find(article => article.id === selectedArticleId);

  const handleArticleClick = (articleId: string) => {
    onSelect(articleId);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="article-selector">
      <div className="selector-header" onClick={toggleExpanded}>
        <h2>
          📝 Select Article
          {selectedArticle && (
            <span className="selected-indicator"> • {selectedArticle.title}</span>
          )}
        </h2>
        <button 
          className="toggle-button"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="article-list">
          {articles.length === 0 ? (
            <div className="no-articles">
              <p>No articles available</p>
            </div>
          ) : (
            articles.map(article => (
              <button
                key={article.id}
                className={`article-item ${selectedArticleId === article.id ? 'selected' : ''}`}
                onClick={() => handleArticleClick(article.id)}
              >
                <div className="article-icon">
                  {selectedArticleId === article.id ? '✓' : '📄'}
                </div>
                <div className="article-info">
                  <div className="article-title">{article.title}</div>
                  <div className="article-id">ID: {article.id.slice(0, 8)}...</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {!selectedArticleId && articles.length > 0 && (
        <div className="selection-hint">
          👆 Please select an article to upload images
        </div>
      )}
    </div>
  );
}
