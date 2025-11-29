import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CertificateFiles {
  key: string;
  cert: string;
}

/**
 * Generate self-signed certificate for HTTPS
 * Certificates are stored in ~/.blog-assistant/certs/
 */
export function generateSelfSignedCertificate(): CertificateFiles {
  const certDir = path.join(os.homedir(), '.blog-assistant', 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  // Create directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('Using existing certificates');
    return {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
    };
  }

  console.log('Generating self-signed certificate...');

  try {
    // Generate private key and certificate using openssl
    execSync(
      `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" ` +
        `-days 365 -nodes -subj "/CN=localhost"`,
      { stdio: 'pipe' }
    );

    console.log('Certificate generated successfully');

    return {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
    };
  } catch (error) {
    console.error('Failed to generate certificate:', error);
    throw new Error('Certificate generation failed. Please ensure openssl is installed.');
  }
}

/**
 * Delete certificate files (for cleanup)
 */
export function deleteCertificates(): void {
  const certDir = path.join(os.homedir(), '.blog-assistant', 'certs');
  
  if (fs.existsSync(certDir)) {
    fs.rmSync(certDir, { recursive: true, force: true });
    console.log('Certificates deleted');
  }
}
