import { ConfigService } from '../services/ConfigService';
import { AWSCredentials } from '../types';
import * as keytar from 'keytar';

// Mock keytar
jest.mock('keytar');

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockCredentials: AWSCredentials = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    region: 'us-east-1',
    bucketName: 'test-bucket',
  };

  beforeEach(() => {
    configService = new ConfigService();
    jest.clearAllMocks();
  });

  describe('saveConfig', () => {
    it('should save AWS credentials to OS keychain', async () => {
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);

      await configService.saveConfig(mockCredentials);

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'blog-writing-assistant',
        'aws-credentials',
        JSON.stringify(mockCredentials)
      );
    });

    it('should throw error if keychain save fails', async () => {
      (keytar.setPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(configService.saveConfig(mockCredentials)).rejects.toThrow(
        'Failed to save credentials'
      );
    });
  });

  describe('loadConfig', () => {
    it('should load AWS credentials from OS keychain', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValue(JSON.stringify(mockCredentials));

      const result = await configService.loadConfig();

      expect(keytar.getPassword).toHaveBeenCalledWith(
        'blog-writing-assistant',
        'aws-credentials'
      );
      expect(result).toEqual(mockCredentials);
    });

    it('should return null if no credentials exist', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValue(null);

      const result = await configService.loadConfig();

      expect(result).toBeNull();
    });

    it('should throw error if keychain read fails', async () => {
      (keytar.getPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(configService.loadConfig()).rejects.toThrow('Failed to load credentials');
    });

    it('should handle corrupted data gracefully', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValue('invalid-json');

      await expect(configService.loadConfig()).rejects.toThrow('Failed to load credentials');
    });
  });

  describe('configExists', () => {
    it('should return true if credentials exist', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValue(JSON.stringify(mockCredentials));

      const result = await configService.configExists();

      expect(result).toBe(true);
    });

    it('should return false if no credentials exist', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValue(null);

      const result = await configService.configExists();

      expect(result).toBe(false);
    });
  });

  describe('deleteAllData', () => {
    it('should delete credentials from OS keychain', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);

      await configService.deleteAllData();

      expect(keytar.deletePassword).toHaveBeenCalledWith(
        'blog-writing-assistant',
        'aws-credentials'
      );
    });

    it('should not throw error if credentials do not exist', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(false);

      await expect(configService.deleteAllData()).resolves.not.toThrow();
    });

    it('should throw error if keychain delete fails', async () => {
      (keytar.deletePassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(configService.deleteAllData()).rejects.toThrow('Failed to delete credentials');
    });
  });
});
