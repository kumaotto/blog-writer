import * as keytar from 'keytar';
import { AWSCredentials } from '../types';

/**
 * ConfigService - AWS credentials management with OS keychain
 * Uses macOS Keychain or Windows Credential Manager
 */
export class ConfigService {
  private readonly serviceName = 'blog-writing-assistant';
  private readonly accountName = 'aws-credentials';

  /**
   * Save AWS credentials to OS keychain
   */
  async saveConfig(credentials: AWSCredentials): Promise<void> {
    try {
      const credentialsJson = JSON.stringify(credentials);
      await keytar.setPassword(this.serviceName, this.accountName, credentialsJson);
    } catch (error) {
      console.error('Failed to save credentials to keychain:', error);
      throw new Error('Failed to save credentials');
    }
  }

  /**
   * Load AWS credentials from OS keychain
   */
  async loadConfig(): Promise<AWSCredentials | null> {
    try {
      const credentialsJson = await keytar.getPassword(this.serviceName, this.accountName);

      if (!credentialsJson) {
        return null;
      }

      const credentials = JSON.parse(credentialsJson) as AWSCredentials;
      return credentials;
    } catch (error) {
      console.error('Failed to load credentials from keychain:', error);
      throw new Error('Failed to load credentials');
    }
  }

  /**
   * Check if AWS credentials exist in OS keychain
   */
  async configExists(): Promise<boolean> {
    try {
      const credentialsJson = await keytar.getPassword(this.serviceName, this.accountName);
      return credentialsJson !== null;
    } catch (error) {
      console.error('Failed to check credentials existence:', error);
      return false;
    }
  }

  /**
   * Delete all data (AWS credentials) from OS keychain
   * Used for uninstallation
   */
  async deleteAllData(): Promise<void> {
    try {
      await keytar.deletePassword(this.serviceName, this.accountName);
      console.log('Credentials deleted from keychain');
    } catch (error) {
      console.error('Failed to delete credentials from keychain:', error);
      throw new Error('Failed to delete credentials');
    }
  }
}
