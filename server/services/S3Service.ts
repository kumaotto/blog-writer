import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { AWSCredentials, ImageMetadata } from '../types';

/**
 * S3Service - AWS S3 image management
 */
export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private region: string = '';

  /**
   * Initialize S3 client with AWS credentials
   */
  async initialize(credentials: AWSCredentials): Promise<boolean> {
    try {
      this.bucketName = credentials.bucketName;
      this.region = credentials.region;

      this.s3Client = new S3Client({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize S3 client:', error);
      return false;
    }
  }

  /**
   * Upload image to S3
   */
  async uploadImage(file: Buffer, mimeType: string): Promise<{ url: string; key: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      // Generate unique file name with date-based folder structure
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const extension = mimeType.split('/')[1];
      const fileName = `${uuidv4()}.${extension}`;
      const key = `${year}/${month}/${day}/${fileName}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      // Generate public URL
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return { url, key };
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Delete image from S3
   */
  async deleteImage(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * List all images from S3
   */
  async listImages(): Promise<ImageMetadata[]> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      return response.Contents.map((item) => ({
        key: item.Key!,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${item.Key}`,
        uploadedAt: item.LastModified!,
        size: item.Size!,
        mimeType: this.getMimeTypeFromKey(item.Key!),
      }));
    } catch (error) {
      console.error('Failed to list images:', error);
      throw new Error('Failed to list images');
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const command = new HeadBucketCommand({
        Bucket: this.bucketName,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }

  /**
   * Get MIME type from file key
   */
  private getMimeTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}

