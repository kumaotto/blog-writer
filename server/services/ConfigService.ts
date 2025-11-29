import * as keytar from 'keytar';
import { AWSCredentials } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * ConfigService - AWS credentials management with OS keychain
 * Uses macOS Keychain or Windows Credential Manager
 * Falls back to encrypted file storage if keychain is unavailable
 */
export class ConfigService {
  private readonly serviceName = 'blog-writing-assistant';
  private readonly accountName = 'aws-credentials';
  private readonly configDir = path.join(os.homedir(), '.blog-writing-assistant');
  private readonly configFile = path.join(this.configDir, 'credentials.enc');
  private readonly algorithm = 'aes-256-gcm';

  /**
   * Save AWS credentials to OS keychain or encrypted file
   */
  async saveConfig(credentials: AWSCredentials): Promise<void> {
    // Try keychain first
    try {
      console.log('💾 Attempting to save credentials to keychain...');
      console.log('   Service:', this.serviceName);
      console.log('   Account:', this.accountName);
      
      const credentialsJson = JSON.stringify(credentials);
      await keytar.setPassword(this.serviceName, this.accountName, credentialsJson);
      
      console.log('✅ Credentials saved successfully to keychain');
      return;
    } catch (error) {
      console.error('⚠️  Keychain save failed, trying encrypted file storage...');
      console.error('   Error:', error instanceof Error ? error.message : String(error));
    }

    // Fallback to encrypted file storage
    try {
      await this.saveToFile(credentials);
      console.log('✅ Credentials saved to encrypted file');
    } catch (error) {
      console.error('❌ Failed to save credentials to file:', error);
      throw new Error(`Failed to save credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save credentials to encrypted file
   */
  private async saveToFile(credentials: AWSCredentials): Promise<void> {
    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Generate encryption key from machine ID
    const key = this.getEncryptionKey();
    
    // Encrypt credentials
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const credentialsJson = JSON.stringify(credentials);
    let encrypted = cipher.update(credentialsJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Save encrypted data with IV and auth tag
    const data = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    };
    
    await fs.writeFile(this.configFile, JSON.stringify(data), 'utf8');
  }

  /**
   * Load credentials from encrypted file
   */
  private async loadFromFile(): Promise<AWSCredentials | null> {
    try {
      const fileContent = await fs.readFile(this.configFile, 'utf8');
      const data = JSON.parse(fileContent);
      
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(data.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted) as AWSCredentials;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Generate encryption key from machine-specific data
   */
  private getEncryptionKey(): Buffer {
    // Use hostname and homedir as machine-specific seed
    const seed = `${os.hostname()}-${os.homedir()}-${this.serviceName}`;
    return crypto.createHash('sha256').update(seed).digest();
  }

  /**
   * Load AWS credentials from OS keychain, encrypted file, or environment variables
   * Priority: 1. Keychain, 2. Encrypted file, 3. Environment variables
   */
  async loadConfig(): Promise<AWSCredentials | null> {
    // Try keychain first
    try {
      const credentialsJson = await keytar.getPassword(this.serviceName, this.accountName);

      if (credentialsJson) {
        console.log('✅ Loaded credentials from keychain');
        const credentials = JSON.parse(credentialsJson) as AWSCredentials;
        return credentials;
      }
    } catch (error) {
      console.log('⚠️  Keychain load failed, trying encrypted file...');
    }

    // Try encrypted file
    try {
      const fileCredentials = await this.loadFromFile();
      if (fileCredentials) {
        console.log('✅ Loaded credentials from encrypted file');
        return fileCredentials;
      }
    } catch (error) {
      console.log('⚠️  File load failed, trying environment variables...');
    }

    // Fallback to environment variables
    const envCredentials = this.loadFromEnvironment();
    if (envCredentials) {
      console.log('✅ Loaded credentials from environment variables');
      return envCredentials;
    }

    console.log('ℹ️  No credentials found');
    return null;
  }

  /**
   * Load credentials from environment variables
   */
  private loadFromEnvironment(): AWSCredentials | null {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (accessKeyId && secretAccessKey && region && bucketName) {
      return {
        accessKeyId,
        secretAccessKey,
        region,
        bucketName
      };
    }

    return null;
  }

  /**
   * Check if AWS credentials exist in OS keychain or encrypted file
   */
  async configExists(): Promise<boolean> {
    // Check keychain
    try {
      const credentialsJson = await keytar.getPassword(this.serviceName, this.accountName);
      if (credentialsJson !== null) {
        return true;
      }
    } catch (error) {
      // Ignore keychain errors
    }

    // Check encrypted file
    try {
      await fs.access(this.configFile);
      return true;
    } catch (error) {
      // File doesn't exist
    }

    // Check environment variables
    return this.loadFromEnvironment() !== null;
  }

  /**
   * Delete all data (AWS credentials) from OS keychain and encrypted file
   * Used for uninstallation
   */
  async deleteAllData(): Promise<void> {
    let keychainDeleted = false;
    let fileDeleted = false;

    // Try deleting from keychain
    try {
      await keytar.deletePassword(this.serviceName, this.accountName);
      console.log('✅ Credentials deleted from keychain');
      keychainDeleted = true;
    } catch (error) {
      console.log('⚠️  No credentials in keychain to delete');
    }

    // Try deleting encrypted file
    try {
      await fs.unlink(this.configFile);
      console.log('✅ Credentials file deleted');
      fileDeleted = true;
    } catch (error) {
      console.log('⚠️  No credentials file to delete');
    }

    if (!keychainDeleted && !fileDeleted) {
      throw new Error('No credentials found to delete');
    }
  }
}
