import { S3Service } from '../services/S3Service';
import { AWSCredentials } from '../types';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('S3Service', () => {
  let s3Service: S3Service;
  const mockCredentials: AWSCredentials = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    region: 'us-east-1',
    bucketName: 'test-bucket',
  };

  beforeEach(() => {
    s3Service = new S3Service();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize S3 client with credentials', async () => {
      const result = await s3Service.initialize(mockCredentials);

      expect(result).toBe(true);
      expect(S3Client).toHaveBeenCalledWith({
        region: mockCredentials.region,
        credentials: {
          accessKeyId: mockCredentials.accessKeyId,
          secretAccessKey: mockCredentials.secretAccessKey,
        },
      });
    });

    it('should return false if initialization fails', async () => {
      (S3Client as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Initialization error');
      });

      const result = await s3Service.initialize(mockCredentials);

      expect(result).toBe(false);
    });
  });

  describe('uploadImage', () => {
    beforeEach(async () => {
      await s3Service.initialize(mockCredentials);
    });

    it('should upload image to S3 and return URL', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const imageBuffer = Buffer.from('test-image-data');
      const result = await s3Service.uploadImage(imageBuffer, 'image/png');

      expect(result.url).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/.+\.png$/);
      expect(result.key).toMatch(/^\d{4}\/\d{2}\/\d{2}\/.+\.png$/);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should generate unique file names', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const imageBuffer = Buffer.from('test-image-data');
      const result1 = await s3Service.uploadImage(imageBuffer, 'image/png');
      const result2 = await s3Service.uploadImage(imageBuffer, 'image/png');

      expect(result1.key).not.toBe(result2.key);
    });

    it('should throw error if upload fails', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Upload error'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const imageBuffer = Buffer.from('test-image-data');
      await expect(s3Service.uploadImage(imageBuffer, 'image/png')).rejects.toThrow('Failed to upload image');
    });
  });

  describe('deleteImage', () => {
    beforeEach(async () => {
      await s3Service.initialize(mockCredentials);
    });

    it('should delete image from S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      await s3Service.deleteImage('2024/01/01/test-image.png');

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should throw error if delete fails', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Delete error'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      await expect(s3Service.deleteImage('test-key')).rejects.toThrow('Failed to delete image');
    });
  });

  describe('listImages', () => {
    beforeEach(async () => {
      await s3Service.initialize(mockCredentials);
    });

    it('should list all images from S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Contents: [
          {
            Key: '2024/01/01/image1.png',
            LastModified: new Date('2024-01-01'),
            Size: 1024,
          },
          {
            Key: '2024/01/02/image2.jpg',
            LastModified: new Date('2024-01-02'),
            Size: 2048,
          },
        ],
      });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const result = await s3Service.listImages();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('2024/01/01/image1.png');
      expect(result[0].url).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/2024\/01\/01\/image1\.png$/);
      expect(result[0].uploadedAt).toEqual(new Date('2024-01-01'));
      expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });

    it('should return empty array if no images exist', async () => {
      const mockSend = jest.fn().mockResolvedValue({ Contents: [] });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const result = await s3Service.listImages();

      expect(result).toEqual([]);
    });

    it('should throw error if list fails', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('List error'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      await expect(s3Service.listImages()).rejects.toThrow('Failed to list images');
    });
  });

  describe('testConnection', () => {
    it('should return true if connection is successful', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const result = await s3Service.testConnection();

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
    });

    it('should return false if connection fails', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Connection error'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await s3Service.initialize(mockCredentials);

      const result = await s3Service.testConnection();

      expect(result).toBe(false);
    });
  });
});
