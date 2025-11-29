# Design Document

## Overview

ブログ執筆補助アプリは、Node.js + Express をバックエンド、React をフロントエンドとしたローカルWebアプリケーションです。スマホからの画像アップロードをQRコード認証で保護し、AWS S3に画像を保存、PC上のマークダウンエディタにリアルタイムで挿入します。

### Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Markdown Editor**: CodeMirror 6
- **Markdown Parser**: marked.js
- **Storage**: AWS S3 (画像), ローカルファイルシステム (マークダウンファイル)
- **Security**: HTTPS (自己署名証明書), トークンベース認証
- **QR Code**: qrcode ライブラリ
- **Real-time Communication**: WebSocket (Socket.IO)

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         PC (Local)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Browser (Editor)                    │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Article Tabs│  │ MD Editor    │  │  Preview    │  │  │
│  │  │             │  │ (CodeMirror) │  │  (marked)   │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌─────────────┐  ┌──────────────┐                   │  │
│  │  │ QR Code     │  │ Image Gallery│                   │  │
│  │  │ Display     │  │              │                   │  │
│  │  └─────────────┘  └──────────────┘                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            │ WebSocket + HTTPS               │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Local Server (Express)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ Auth Service │  │ File Service │  │ S3 Service │  │  │
│  │  │ (Token Mgmt) │  │ (Local FS)   │  │ (AWS SDK)  │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ WebSocket    │  │ Config Mgmt  │                  │  │
│  │  │ Server       │  │              │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (QR Code Token)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Smartphone (Mobile)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Browser (Mobile Upload Interface)           │  │
│  │  ┌─────────────┐  ┌──────────────┐                   │  │
│  │  │ QR Scanner  │  │ Article List │                   │  │
│  │  │ (Camera)    │  │ Selector     │                   │  │
│  │  └─────────────┘  └──────────────┘                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │        Image Upload (File Input)                │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
                    ┌───────────────┐
                    │   AWS S3      │
                    │  (Images)     │
                    └───────────────┘
```

### Data Flow

#### 画像アップロードフロー (スマホ → PC)

1. PC: Local Server起動 → QRコード生成・表示
2. スマホ: QRコードスキャン → QR Code Token付きURLにアクセス
3. Server: QR Code Token検証 → Session Token発行 → Cookie保存
4. スマホ: Article Tab選択 → 画像選択 → アップロード
5. Server: Session Token検証 → S3にアップロード → 画像URL取得
6. Server: WebSocket経由でPC Editorに画像URL送信
7. PC Editor: 選択されたArticle Tabのカーソル位置にマークダウン挿入

#### マークダウン編集フロー

1. PC: Article Tab作成/選択
2. PC: マークダウン入力
3. PC: リアルタイムでHTMLプレビュー更新
4. PC: 保存ボタン → ローカルファイルシステムに保存

## Components and Interfaces

### Backend Components

#### 1. AuthService

**責任**: トークン生成・検証、セッション管理

```typescript
interface AuthService {
  // QRコード用トークン生成 (10分有効)
  generateQRToken(): { token: string; expiresAt: Date };
  
  // QRトークン検証 & セッショントークン発行 (24時間有効)
  validateQRTokenAndIssueSession(qrToken: string): { sessionToken: string; expiresAt: Date } | null;
  
  // セッショントークン検証
  validateSessionToken(sessionToken: string): boolean;
  
  // セッショントークン延長
  extendSessionToken(sessionToken: string): void;
  
  // QRトークン無効化
  invalidateQRToken(qrToken: string): void;
  
  // 新しいQRコード生成 (既存トークン無効化)
  regenerateQRCode(): { token: string; qrCodeDataURL: string };
}
```

#### 2. S3Service

**責任**: AWS S3への画像アップロード・削除・一覧取得

```typescript
interface S3Service {
  // 設定初期化
  initialize(credentials: AWSCredentials): Promise<boolean>;
  
  // 画像アップロード
  uploadImage(file: Buffer, mimeType: string): Promise<{ url: string; key: string }>;
  
  // 画像削除
  deleteImage(key: string): Promise<void>;
  
  // 画像一覧取得
  listImages(): Promise<Array<{ url: string; key: string; uploadedAt: Date }>>;
  
  // 接続テスト
  testConnection(): Promise<boolean>;
}
```

#### 3. FileService

**責任**: ローカルファイルシステムへのマークダウンファイル読み書き

```typescript
interface FileService {
  // ファイル読み込み
  readFile(filePath: string): Promise<string>;
  
  // ファイル保存
  saveFile(filePath: string, content: string): Promise<void>;
  
  // ファイル一覧取得 (最近使用したファイル)
  listRecentFiles(): Promise<Array<{ path: string; name: string; lastModified: Date }>>;
}
```

#### 4. ConfigService

**責任**: AWS認証情報のOS keychain保存・読み込み

```typescript
interface ConfigService {
  // 設定保存 (OS keychainに保存)
  saveConfig(credentials: AWSCredentials): Promise<void>;
  
  // 設定読み込み (OS keychainから読み込み)
  loadConfig(): Promise<AWSCredentials | null>;
  
  // 設定存在確認
  configExists(): Promise<boolean>;
  
  // 全データ削除（アンインストール用、keychainエントリも削除）
  deleteAllData(): Promise<void>;
}

// 注: keytarライブラリを使用してOS keychainに保存
// macOS: Keychain Access
// Windows: Credential Manager
// ファイルシステムには一切保存しない（ゴミファイルなし）
```

#### 5. WebSocketService

**責任**: PC-スマホ間のリアルタイム通信

```typescript
interface WebSocketService {
  // 画像挿入イベント送信 (スマホ → PC)
  emitImageInsert(articleId: string, imageUrl: string): void;
  
  // Article Tab一覧送信 (PC → スマホ)
  emitArticleList(articles: Array<{ id: string; title: string }>): void;
  
  // Article Tab更新通知 (PC → スマホ)
  emitArticleUpdate(articleId: string, title: string): void;
}
```

### Frontend Components (React)

#### PC Editor Components

##### 1. EditorLayout

**責任**: 全体レイアウト、タブ管理

```typescript
interface EditorLayoutProps {}

interface EditorLayoutState {
  articles: Article[];
  activeArticleId: string | null;
  qrCodeDataURL: string;
}
```

##### 2. ArticleTabBar

**責任**: タブ表示・切り替え・閉じる

```typescript
interface ArticleTabBarProps {
  articles: Article[];
  activeArticleId: string | null;
  onTabClick: (articleId: string) => void;
  onTabClose: (articleId: string) => void;
  onNewTab: () => void;
}
```

##### 3. MarkdownEditor

**責任**: CodeMirror統合、マークダウン編集、自動保存、LocalStorageバックアップ

```typescript
interface MarkdownEditorProps {
  articleId: string;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onImageDrop: (file: File) => void;
}

// 自動保存: 5秒間操作なしで自動保存
// LocalStorageバックアップ: 編集内容を自動的にLocalStorageに保存
// 復元機能: ブラウザクラッシュ後の起動時にバックアップから復元を提案
```

##### 4. MarkdownPreview

**責任**: マークダウンのHTMLプレビュー表示

```typescript
interface MarkdownPreviewProps {
  content: string;
}
```

##### 5. QRCodeDisplay

**責任**: QRコード表示・再生成

```typescript
interface QRCodeDisplayProps {
  qrCodeDataURL: string;
  onRegenerate: () => void;
}
```

##### 6. ImageGallery

**責任**: S3画像一覧・削除・URLコピー

```typescript
interface ImageGalleryProps {
  images: Array<{ url: string; key: string; uploadedAt: Date }>;
  onDelete: (key: string) => void;
  onCopyURL: (url: string) => void;
}
```

##### 7. ConfigModal

**責任**: AWS認証情報設定

```typescript
interface ConfigModalProps {
  isOpen: boolean;
  onSave: (credentials: AWSCredentials) => void;
  onClose: () => void;
}
```

#### Mobile Upload Components

##### 1. MobileUploadLayout

**責任**: モバイル画面全体レイアウト

```typescript
interface MobileUploadLayoutProps {
  sessionToken: string;
}
```

##### 2. ArticleSelector

**責任**: 挿入先記事選択

```typescript
interface ArticleSelectorProps {
  articles: Array<{ id: string; title: string }>;
  selectedArticleId: string | null;
  onSelect: (articleId: string) => void;
}
```

##### 3. ImageUploader

**責任**: 画像選択・アップロード

```typescript
interface ImageUploaderProps {
  selectedArticleId: string | null;
  onUploadSuccess: () => void;
  onUploadError: (error: string) => void;
}
```

## Data Models

### Article

```typescript
interface Article {
  id: string;              // UUID
  title: string;           // ファイル名 (拡張子なし)
  filePath: string;        // 絶対パス
  content: string;         // マークダウンコンテンツ
  cursorPosition: number;  // カーソル位置 (文字オフセット)
  isDirty: boolean;        // 未保存フラグ
  lastModified: Date;      // 最終更新日時
}
```

### AWSCredentials

```typescript
interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}
```

### Token

```typescript
interface Token {
  value: string;           // トークン文字列 (UUID)
  type: 'qr' | 'session';  // トークンタイプ
  expiresAt: Date;         // 有効期限
  createdAt: Date;         // 作成日時
}
```

### ImageMetadata

```typescript
interface ImageMetadata {
  key: string;             // S3オブジェクトキー
  url: string;             // 公開URL
  uploadedAt: Date;        // アップロード日時
  size: number;            // ファイルサイズ (bytes)
  mimeType: string;        // MIMEタイプ
}
```

## Error Handling

### エラー分類

#### 1. 認証エラー

- **QRトークン期限切れ**: 新しいQRコードのスキャンを促す
- **セッショントークン無効**: 再認証を要求
- **トークン不正**: エラーメッセージ表示

#### 2. S3エラー

- **アップロード失敗**: リトライ機能、エラーメッセージ表示
- **認証情報不正**: 設定画面に誘導
- **ネットワークエラー**: オフライン通知、リトライ

#### 3. ファイルシステムエラー

- **ファイル読み込み失敗**: エラーメッセージ、ファイル選択画面に戻る
- **ファイル保存失敗**: 自動保存リトライ、ユーザー通知
- **権限エラー**: 具体的なエラーメッセージ表示

#### 4. WebSocketエラー

- **接続切断**: 自動再接続、接続状態表示
- **メッセージ送信失敗**: リトライ、エラー通知

### エラーハンドリング戦略

```typescript
class ErrorHandler {
  // グローバルエラーハンドラ
  static handleError(error: Error, context: string): void {
    console.error(`[${context}]`, error);
    
    if (error instanceof AuthError) {
      this.handleAuthError(error);
    } else if (error instanceof S3Error) {
      this.handleS3Error(error);
    } else if (error instanceof FileSystemError) {
      this.handleFileSystemError(error);
    } else {
      this.showGenericError(error.message);
    }
  }
  
  // 認証エラー処理
  private static handleAuthError(error: AuthError): void {
    if (error.code === 'TOKEN_EXPIRED') {
      // 再認証UI表示
    } else if (error.code === 'INVALID_TOKEN') {
      // エラーメッセージ表示
    }
  }
  
  // S3エラー処理 (リトライロジック)
  private static async handleS3Error(error: S3Error): Promise<void> {
    if (error.retryable) {
      await this.retryWithBackoff(error.operation, 3);
    } else {
      this.showError(error.message);
    }
  }
  
  // 指数バックオフリトライ
  private static async retryWithBackoff(
    operation: () => Promise<void>,
    maxRetries: number
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await operation();
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests

#### Backend

- **AuthService**: トークン生成・検証・期限切れロジック
- **S3Service**: AWS SDK モック、アップロード・削除ロジック
- **FileService**: ファイル読み書きロジック
- **ConfigService**: 暗号化・復号化ロジック

#### Frontend

- **MarkdownEditor**: CodeMirror統合、画像ドロップ処理
- **MarkdownPreview**: マークダウンパース、HTMLレンダリング
- **ArticleTabBar**: タブ切り替え、閉じる処理

### Integration Tests

- **画像アップロードフロー**: スマホ → S3 → PC Editor挿入
- **認証フロー**: QRコードスキャン → セッション確立
- **WebSocket通信**: PC-スマホ間のリアルタイム同期

### E2E Tests

- **完全な執筆フロー**: 記事作成 → 画像挿入 → 保存 → WordPress入稿
- **複数タブ操作**: タブ切り替え、同時編集
- **セキュリティシナリオ**: トークン期限切れ、不正アクセス

### Manual Testing

- **実機テスト**: 実際のスマホ・PCで動作確認
- **ネットワークテスト**: 大規模Wi-Fi環境でのセキュリティ確認
- **WordPress連携**: Jetpack Markdownでの表示確認

## Security Considerations

### 1. トークン管理

- QRトークン: 5分有効、使い捨て
- セッショントークン: 1時間有効、延長なし（期限切れ後は再スキャン）
- トークン保存: メモリ内のみ（永続化しない）
- トークン形式: UUID v4 (128-bit ランダム)
- サーバー再起動: 全トークン無効化（セッション単位）
- **重要**: トークン切れはスマホからの画像アップロード機能のみ影響、PC側の編集・保存機能は常に動作

### 2. 通信暗号化

- HTTPS: 自己署名証明書使用
- WebSocket: WSS (WebSocket over TLS)
- 証明書警告: 初回アクセス時にユーザーが承認

### 3. AWS認証情報保護

- 暗号化: AES-256-GCM
- 鍵管理: OS keychain（macOS Keychain、Windows Credential Manager）
- ライブラリ: `keytar` npmパッケージ
- 保存先: OSのセキュアストレージ（ファイルシステムには保存しない）
- アンインストール: 設定画面に「全データ削除」ボタンでkeychainエントリも削除
- **メリット**: パスワード入力不要、OSレベルのセキュリティ、ゴミファイルなし
- **対応OS**: macOS、Windows

### 4. CORS設定

- Origin制限: `https://localhost:*` のみ許可
- Credentials: `true` (Cookie送信許可)

### 5. Rate Limiting

- 画像アップロード: 1分間に10回まで
- QRコード生成: 1分間に5回まで

## Deployment and Distribution

### パッケージング

- **Electron**: デスクトップアプリとして配布
- **バンドル**: フロントエンド + バックエンドを単一実行ファイルに
- **プラットフォーム**: macOS, Windows, Linux

### 配布方法

- **GitHub Releases**: バイナリ配布
- **npm**: `npx blog-assistant` で起動可能
- **Docker**: コンテナイメージ提供（オプション）

### 初回セットアップ

1. アプリ起動
2. AWS認証情報入力画面表示
3. 認証情報保存（OS keychainに保存） & S3接続テスト
4. Editor画面表示 & QRコード生成

### 2回目以降の起動

1. アプリ起動
2. OS keychainから認証情報を自動読み込み
3. Editor画面表示 & QRコード生成

### アンインストール

- 設定画面の「全データ削除」ボタンでOS keychainエントリを削除
- ファイルシステムにはゴミファイルなし
- 画像（S3）とマークダウンファイル（ユーザー指定場所）は削除されない

### アップデート

- 自動更新チェック（オプション）
- GitHub Releasesから手動ダウンロード

## Performance Considerations

### 1. マークダウンプレビュー

- デバウンス: 300ms
- 仮想スクロール: 長文記事対応
- 差分レンダリング: 変更部分のみ更新

### 2. 画像アップロード

- 圧縮: 2MB以上の画像は自動圧縮
- プログレス表示: アップロード進捗バー
- 並列アップロード: 最大3枚同時

### 3. WebSocket

- ハートビート: 30秒ごとにping/pong
- 自動再接続: 指数バックオフ
- メッセージキュー: オフライン時のメッセージ保存

### 4. ファイル保存

- 自動保存: 5秒間操作なしで自動保存
- 保存キュー: 複数タブの保存を順次処理
- LocalStorageバックアップ: ブラウザクラッシュ対策として編集内容を自動バックアップ
- 未保存警告: タブ閉じる時、ブラウザ閉じる時に警告表示

## Future Enhancements

### Phase 2 (オプション機能)

- WordPress API連携: 自動投稿機能
- 画像編集: トリミング、リサイズ
- マークダウンテンプレート: よく使う構造の保存
- ダークモード対応

### Phase 3 (高度な機能)

- 複数デバイス同期: クラウド経由
- コラボレーション: 複数人での同時編集
- バージョン管理: Git統合
- プラグインシステム: カスタム拡張機能
