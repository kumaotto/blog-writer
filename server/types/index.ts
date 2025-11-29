// Type definitions

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export interface Token {
  value: string;
  type: 'qr' | 'session';
  expiresAt: Date;
  createdAt: Date;
}

export interface ImageMetadata {
  key: string;
  url: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
}

export interface Article {
  id: string;
  title: string;
  filePath: string;
  content: string;
  cursorPosition: number;
  isDirty: boolean;
  lastModified: Date;
}
