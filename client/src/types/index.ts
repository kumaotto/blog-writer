// Article types
export interface Article {
  id: string;              // UUID
  title: string;           // ファイル名 (拡張子なし)
  filePath: string;        // 絶対パス
  content: string;         // マークダウンコンテンツ
  cursorPosition: number;  // カーソル位置 (文字オフセット)
  isDirty: boolean;        // 未保存フラグ
  lastModified: Date;      // 最終更新日時
}

// WebSocket connection status
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  sessionToken: string | null;
  qrCodeDataURL: string | null;
  tokenExpiresAt: Date | null;
}

// AWS Credentials
export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

// Image metadata
export interface ImageMetadata {
  key: string;
  url: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
}
