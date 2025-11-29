import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArticleTabBar } from '../ArticleTabBar';
import { Article } from '../../types';

describe('ArticleTabBar', () => {
  const mockArticles: Article[] = [
    {
      id: '1',
      title: 'First Article',
      filePath: '/path/to/first.md',
      content: 'Content 1',
      cursorPosition: 0,
      isDirty: false,
      lastModified: new Date(),
    },
    {
      id: '2',
      title: 'Second Article with a Very Long Title That Should Be Truncated',
      filePath: '/path/to/second.md',
      content: 'Content 2',
      cursorPosition: 0,
      isDirty: true,
      lastModified: new Date(),
    },
    {
      id: '3',
      title: '',
      filePath: '',
      content: 'Content 3',
      cursorPosition: 0,
      isDirty: false,
      lastModified: new Date(),
    },
  ];

  const mockOnTabClick = jest.fn();
  const mockOnTabClose = jest.fn();
  const mockOnNewTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('タイトル表示', () => {
    it('記事タイトルを表示する', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="1"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      expect(screen.getByText('First Article')).toBeInTheDocument();
    });

    it('タイトルが空の場合は"Untitled"を表示する', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="3"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const untitledTabs = screen.getAllByText('Untitled');
      expect(untitledTabs.length).toBeGreaterThan(0);
    });

    it('タイトルが20文字を超える場合は切り詰めて"..."を追加する', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="2"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const truncatedTitle = screen.getByText(/Second Article with/);
      // タイトルが切り詰められていることを確認（"..."が含まれる）
      expect(truncatedTitle.textContent).toContain('...');
      // タイトル部分（未保存インジケーターを除く）が適切な長さであることを確認
      const titleText = truncatedTitle.textContent!.replace('●', '').trim();
      expect(titleText).toMatch(/\.\.\.$/);
      expect(titleText.length).toBeLessThanOrEqual(23); // 20 + "..."
    });
  });

  describe('未保存インジケーター', () => {
    it('isDirtyがtrueの場合、ドットインジケーターを表示する', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="2"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const dirtyIndicators = screen.getAllByText('●');
      expect(dirtyIndicators.length).toBeGreaterThan(0);
    });

    it('isDirtyがfalseの場合、ドットインジケーターを表示しない', () => {
      const cleanArticles = mockArticles.filter(a => !a.isDirty);
      render(
        <ArticleTabBar
          articles={cleanArticles}
          activeArticleId="1"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const dirtyIndicators = screen.queryAllByText('●');
      expect(dirtyIndicators.length).toBe(0);
    });
  });

  describe('既存機能の維持', () => {
    it('タブをクリックするとonTabClickが呼ばれる', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="1"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const tab = screen.getByText('First Article').closest('.article-tab');
      fireEvent.click(tab!);

      expect(mockOnTabClick).toHaveBeenCalledWith('1');
    });

    it('閉じるボタンをクリックするとonTabCloseが呼ばれる', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="1"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const closeButtons = screen.getAllByLabelText(/Close/);
      fireEvent.click(closeButtons[0]);

      expect(mockOnTabClose).toHaveBeenCalledWith('1');
    });

    it('新規タブボタンをクリックするとonNewTabが呼ばれる', () => {
      render(
        <ArticleTabBar
          articles={mockArticles}
          activeArticleId="1"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
        />
      );

      const newTabButton = screen.getByLabelText('Create new article');
      fireEvent.click(newTabButton);

      expect(mockOnNewTab).toHaveBeenCalledTimes(1);
    });
  });
});
