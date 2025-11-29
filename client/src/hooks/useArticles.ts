import { useReducer, useCallback } from 'react';
import { Article } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Article actions
type ArticleAction =
  | { type: 'ADD_ARTICLE'; payload: Omit<Article, 'id' | 'lastModified' | 'isDirty'> }
  | { type: 'REMOVE_ARTICLE'; payload: string }
  | { type: 'UPDATE_ARTICLE_CONTENT'; payload: { id: string; content: string } }
  | { type: 'UPDATE_ARTICLE_CURSOR'; payload: { id: string; cursorPosition: number } }
  | { type: 'SET_ACTIVE_ARTICLE'; payload: string | null }
  | { type: 'MARK_ARTICLE_SAVED'; payload: string }
  | { type: 'MARK_ARTICLE_DIRTY'; payload: string }
  | { type: 'UPDATE_ARTICLE_TITLE'; payload: { id: string; title: string } }
  | { type: 'UPDATE_ARTICLE_PATH'; payload: { id: string; filePath: string } };

interface ArticleState {
  articles: Article[];
  activeArticleId: string | null;
}

// Article reducer
function articleReducer(state: ArticleState, action: ArticleAction): ArticleState {
  switch (action.type) {
    case 'ADD_ARTICLE': {
      const newArticle: Article = {
        ...action.payload,
        id: uuidv4(),
        isDirty: false,
        lastModified: new Date(),
      };
      return {
        ...state,
        articles: [...state.articles, newArticle],
        activeArticleId: newArticle.id,
      };
    }

    case 'REMOVE_ARTICLE': {
      const filteredArticles = state.articles.filter(a => a.id !== action.payload);
      const newActiveId = state.activeArticleId === action.payload
        ? (filteredArticles.length > 0 ? filteredArticles[0].id : null)
        : state.activeArticleId;
      return {
        ...state,
        articles: filteredArticles,
        activeArticleId: newActiveId,
      };
    }

    case 'UPDATE_ARTICLE_CONTENT': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload.id
            ? {
                ...article,
                content: action.payload.content,
                isDirty: true,
                lastModified: new Date(),
              }
            : article
        ),
      };
    }

    case 'UPDATE_ARTICLE_CURSOR': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload.id
            ? { ...article, cursorPosition: action.payload.cursorPosition }
            : article
        ),
      };
    }

    case 'SET_ACTIVE_ARTICLE': {
      return {
        ...state,
        activeArticleId: action.payload,
      };
    }

    case 'MARK_ARTICLE_SAVED': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload
            ? { ...article, isDirty: false }
            : article
        ),
      };
    }

    case 'MARK_ARTICLE_DIRTY': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload
            ? { ...article, isDirty: true, lastModified: new Date() }
            : article
        ),
      };
    }

    case 'UPDATE_ARTICLE_TITLE': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload.id
            ? { ...article, title: action.payload.title }
            : article
        ),
      };
    }

    case 'UPDATE_ARTICLE_PATH': {
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload.id
            ? { ...article, filePath: action.payload.filePath }
            : article
        ),
      };
    }

    default:
      return state;
  }
}

// Custom hook for article management
export function useArticles() {
  const [state, dispatch] = useReducer(articleReducer, {
    articles: [],
    activeArticleId: null,
  });

  const addArticle = useCallback((article: Omit<Article, 'id' | 'lastModified' | 'isDirty'>) => {
    dispatch({ type: 'ADD_ARTICLE', payload: article });
  }, []);

  const removeArticle = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ARTICLE', payload: id });
  }, []);

  const updateArticleContent = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_ARTICLE_CONTENT', payload: { id, content } });
  }, []);

  const updateArticleCursor = useCallback((id: string, cursorPosition: number) => {
    dispatch({ type: 'UPDATE_ARTICLE_CURSOR', payload: { id, cursorPosition } });
  }, []);

  const setActiveArticle = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ARTICLE', payload: id });
  }, []);

  const markArticleSaved = useCallback((id: string) => {
    dispatch({ type: 'MARK_ARTICLE_SAVED', payload: id });
  }, []);

  const markArticleDirty = useCallback((id: string) => {
    dispatch({ type: 'MARK_ARTICLE_DIRTY', payload: id });
  }, []);

  const updateArticleTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'UPDATE_ARTICLE_TITLE', payload: { id, title } });
  }, []);

  const updateArticlePath = useCallback((id: string, filePath: string) => {
    dispatch({ type: 'UPDATE_ARTICLE_PATH', payload: { id, filePath } });
  }, []);

  const getActiveArticle = useCallback(() => {
    return state.articles.find(a => a.id === state.activeArticleId) || null;
  }, [state.articles, state.activeArticleId]);

  return {
    articles: state.articles,
    activeArticleId: state.activeArticleId,
    activeArticle: getActiveArticle(),
    addArticle,
    removeArticle,
    updateArticleContent,
    updateArticleCursor,
    setActiveArticle,
    markArticleSaved,
    markArticleDirty,
    updateArticleTitle,
    updateArticlePath,
  };
}
