import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditorLayout } from '../EditorLayout';
import * as hooks from '../../hooks';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock all hooks
jest.mock('../../hooks', () => ({
  useArticles: jest.fn(),
  useAuth: jest.fn(),
  useWebSocket: jest.fn(),
  useLocalStorageBackup: jest.fn(),
  useErrorHandler: jest.fn(),
}));

// Mock child components
jest.mock('../ArticleTabBar', () => ({
  ArticleTabBar: () => <div data-testid="article-tab-bar">ArticleTabBar</div>,
}));

jest.mock('../MarkdownEditor', () => ({
  MarkdownEditor: () => <div data-testid="markdown-editor">MarkdownEditor</div>,
}));

jest.mock('../MarkdownPreview', () => ({
  MarkdownPreview: () => <div data-testid="markdown-preview">MarkdownPreview</div>,
}));

jest.mock('../QRCodeModal', () => ({
  QRCodeModal: ({ isOpen, authState }: any) => (
    isOpen ? (
      <div data-testid="qr-modal">
        <div data-testid="qr-code">{authState.qrCode || 'No QR Code'}</div>
      </div>
    ) : null
  ),
}));

jest.mock('../ImageGallery', () => ({
  ImageGallery: () => <div data-testid="image-gallery">ImageGallery</div>,
}));

jest.mock('../NetworkStatusIndicator', () => ({
  NetworkStatusIndicator: () => <div data-testid="network-status">NetworkStatusIndicator</div>,
}));

jest.mock('../ErrorNotification', () => ({
  ErrorNotification: () => <div data-testid="error-notification">ErrorNotification</div>,
}));

describe('EditorLayout', () => {
  const mockUseArticles = {
    articles: [],
    activeArticle: null,
    createArticle: jest.fn(),
    updateArticle: jest.fn(),
    deleteArticle: jest.fn(),
    setActiveArticle: jest.fn(),
  };

  const mockUseAuth = {
    authState: {
      isAuthenticated: false,
      sessionToken: null,
      qrCodeDataURL: null,
      tokenExpiresAt: null,
    },
    isLoading: false,
    error: null,
    isAuthenticated: false,
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    regenerateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    authenticateWithQRToken: jest.fn().mockResolvedValue('token'),
    logout: jest.fn(),
    isTokenExpired: jest.fn().mockReturnValue(false),
  };

  const mockUseWebSocket = {
    status: 'disconnected' as const,
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockUseLocalStorageBackup = {
    getBackupTimestamp: jest.fn().mockReturnValue(null),
    restoreFromBackup: jest.fn(),
    clearBackup: jest.fn(),
  };
  const mockUseErrorHandler = {
    errors: [],
    addError: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (hooks.useArticles as jest.Mock).mockReturnValue(mockUseArticles);
    (hooks.useAuth as jest.Mock).mockReturnValue(mockUseAuth);
    (hooks.useWebSocket as jest.Mock).mockReturnValue(mockUseWebSocket);
    (hooks.useLocalStorageBackup as jest.Mock).mockReturnValue(mockUseLocalStorageBackup);
    (hooks.useErrorHandler as jest.Mock).mockReturnValue(mockUseErrorHandler);
  });

  it('コンポーネントが正しくレンダリングされる', () => {
    render(<EditorLayout />);
    
    expect(screen.getByTestId('article-tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('network-status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /QR/i })).toBeInTheDocument();
  });

  it('QRコードボタンをクリックするとモーダルが開く', () => {
    render(<EditorLayout />);
    
    const qrButton = screen.getByRole('button', { name: /QR/i });
    fireEvent.click(qrButton);
    
    expect(screen.getByTestId('qr-modal')).toBeInTheDocument();
  });

  it('QRコードが生成されていない場合、モーダルに"No QR Code"が表示される', () => {
    render(<EditorLayout />);
    
    const qrButton = screen.getByRole('button', { name: /QR/i });
    fireEvent.click(qrButton);
    
    expect(screen.getByTestId('qr-code')).toHaveTextContent('No QR Code');
  });

  it('QRコードが生成されている場合、モーダルにQRコードが表示される', () => {
    const mockAuthWithQR = {
      ...mockUseAuth,
      authState: {
        ...mockUseAuth.authState,
        qrCodeDataURL: 'data:image/png;base64,testqrcode',
      },
    };
    
    (hooks.useAuth as jest.Mock).mockReturnValue(mockAuthWithQR);
    
    render(<EditorLayout />);
    
    const qrButton = screen.getByRole('button', { name: /QR/i });
    fireEvent.click(qrButton);
    
    expect(screen.getByTestId('qr-code')).toHaveTextContent('data:image/png;base64,testqrcode');
  });

  it('マウント時にgenerateQRCodeが呼ばれる', () => {
    render(<EditorLayout />);
    
    expect(mockUseAuth.generateQRCode).toHaveBeenCalledTimes(1);
  });

  it('authStateのqrCodeDataURLがqrCodeプロパティとして正しく変換される', () => {
    const mockAuthWithQR = {
      ...mockUseAuth,
      authState: {
        ...mockUseAuth.authState,
        qrCodeDataURL: 'data:image/png;base64,converted',
        tokenExpiresAt: new Date('2024-12-31'),
      },
    };
    
    (hooks.useAuth as jest.Mock).mockReturnValue(mockAuthWithQR);
    
    render(<EditorLayout />);
    
    const qrButton = screen.getByRole('button', { name: /QR/i });
    fireEvent.click(qrButton);
    
    // QRCodeModalに正しいプロパティ名で渡されていることを確認
    expect(screen.getByTestId('qr-code')).toHaveTextContent('data:image/png;base64,converted');
  });
});

describe('EditorLayout - ヘッダーボタン', () => {
  const mockUseArticles = {
    articles: [],
    activeArticle: null,
    createArticle: jest.fn(),
    updateArticle: jest.fn(),
    deleteArticle: jest.fn(),
    setActiveArticle: jest.fn(),
  };

  const mockUseAuth = {
    authState: {
      isAuthenticated: false,
      sessionToken: null,
      qrCodeDataURL: null,
      tokenExpiresAt: null,
    },
    isLoading: false,
    error: null,
    isAuthenticated: false,
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    regenerateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    authenticateWithQRToken: jest.fn().mockResolvedValue('token'),
    logout: jest.fn(),
    isTokenExpired: jest.fn().mockReturnValue(false),
  };

  const mockUseWebSocket = {
    status: 'disconnected' as const,
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockUseLocalStorageBackup = {
    getBackupTimestamp: jest.fn().mockReturnValue(null),
    restoreFromBackup: jest.fn(),
    clearBackup: jest.fn(),
  };

  const mockUseErrorHandler = {
    errors: [],
    addError: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (hooks.useArticles as jest.Mock).mockReturnValue(mockUseArticles);
    (hooks.useAuth as jest.Mock).mockReturnValue(mockUseAuth);
    (hooks.useWebSocket as jest.Mock).mockReturnValue(mockUseWebSocket);
    (hooks.useLocalStorageBackup as jest.Mock).mockReturnValue(mockUseLocalStorageBackup);
    (hooks.useErrorHandler as jest.Mock).mockReturnValue(mockUseErrorHandler);
  });

  it('Copy Markdownボタンが存在しない', () => {
    render(<EditorLayout />);
    
    expect(screen.queryByRole('button', { name: /Copy Markdown/i })).not.toBeInTheDocument();
  });

  it('Export to WordPressボタンが存在しない', () => {
    render(<EditorLayout />);
    
    expect(screen.queryByRole('button', { name: /Export to WordPress/i })).not.toBeInTheDocument();
  });

  it('Saveボタンがヘッダーに存在しない（各タブに移動）', () => {
    render(<EditorLayout />);
    
    // ヘッダーにSaveボタンが存在しないことを確認
    const headerButtons = screen.getAllByRole('button');
    const saveButton = headerButtons.find(btn => btn.textContent?.includes('Save'));
    expect(saveButton).toBeUndefined();
  });

  it('Settingsボタンが存在する', () => {
    render(<EditorLayout />);
    
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });

  it('Show Galleryボタンが存在する', () => {
    render(<EditorLayout />);
    
    expect(screen.getByRole('button', { name: /Show Gallery/i })).toBeInTheDocument();
  });

  it('ボタンがテキストのみで表示される（絵文字なし）', () => {
    render(<EditorLayout />);
    
    const settingsButton = screen.getByRole('button', { name: /Settings/i });
    const galleryButton = screen.getByRole('button', { name: /Gallery/i });
    
    expect(settingsButton.textContent).toBe('Settings');
    expect(galleryButton.textContent).toMatch(/Gallery/);
  });
});

describe('EditorLayout - キーボードショートカット', () => {
  const mockUseArticles = {
    articles: [
      {
        id: '1',
        title: 'Test Article',
        filePath: '/test/article.md',
        content: 'Test content',
        cursorPosition: 0,
        isDirty: true,
        lastModified: new Date(),
      },
    ],
    activeArticleId: '1',
    addArticle: jest.fn(),
    removeArticle: jest.fn(),
    setActiveArticle: jest.fn(),
    updateArticleContent: jest.fn(),
    updateArticleCursor: jest.fn(),
    markArticleSaved: jest.fn(),
    updateArticleTitle: jest.fn(),
    updateArticlePath: jest.fn(),
  };

  const mockUseAuth = {
    authState: {
      isAuthenticated: false,
      sessionToken: null,
      qrCodeDataURL: null,
      tokenExpiresAt: null,
    },
    generateQRCode: jest.fn(() => Promise.resolve('qr-code-data')),
    regenerateQRCode: jest.fn(() => Promise.resolve('qr-code-data')),
    authenticateWithQRToken: jest.fn(() => Promise.resolve('session-token')),
    logout: jest.fn(),
    isLoading: false,
    error: null,
  };

  const mockUseWebSocket = {
    isConnected: false,
    status: 'disconnected' as const,
    sendArticleList: jest.fn(),
    sendImageInsert: jest.fn(),
  };

  const mockUseLocalStorageBackup = {
    loadBackups: jest.fn(() => []),
    clearBackups: jest.fn(),
    getBackupTimestamp: jest.fn(() => null),
  };

  const mockUseErrorHandler = {
    errors: [],
    addError: jest.fn(),
    dismissError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;
    
    (hooks.useArticles as jest.Mock).mockReturnValue(mockUseArticles);
    (hooks.useAuth as jest.Mock).mockReturnValue(mockUseAuth);
    (hooks.useWebSocket as jest.Mock).mockReturnValue(mockUseWebSocket);
    (hooks.useLocalStorageBackup as jest.Mock).mockReturnValue(mockUseLocalStorageBackup);
    (hooks.useErrorHandler as jest.Mock).mockReturnValue(mockUseErrorHandler);
  });

  it('Cmd+Sでアクティブな記事を保存する（Mac）', async () => {

    render(<EditorLayout />);

    // Cmd+S を発火
    fireEvent.keyDown(window, { key: 's', metaKey: true });

    // fetchが呼ばれることを確認
    await screen.findByTestId('article-tab-bar');
    expect(global.fetch).toHaveBeenCalledWith('/api/files', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: '/test/article.md',
        content: 'Test content',
      }),
    }));
  });

  it('Ctrl+Sでアクティブな記事を保存する（Windows/Linux）', async () => {
    render(<EditorLayout />);

    // Ctrl+S を発火
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    // fetchが呼ばれることを確認
    await screen.findByTestId('article-tab-bar');
    expect(global.fetch).toHaveBeenCalledWith('/api/files', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('アクティブな記事がない場合は保存しない', () => {
    (hooks.useArticles as jest.Mock).mockReturnValue({
      ...mockUseArticles,
      activeArticleId: null,
    });

    render(<EditorLayout />);

    // 既存のfetch呼び出しをクリア（記事リスト送信など）
    (global.fetch as jest.Mock).mockClear();

    // Cmd+S を発火
    fireEvent.keyDown(window, { key: 's', metaKey: true });

    // /api/files へのfetchが呼ばれないことを確認
    expect(global.fetch).not.toHaveBeenCalledWith('/api/files', expect.anything());
  });

  it('ブラウザのデフォルト保存ダイアログを防止する', () => {
    render(<EditorLayout />);

    const event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
