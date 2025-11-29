import os from 'os';
import { Server as HTTPSServer } from 'https';
import { Server as SocketIOServer } from 'socket.io';
import { AuthService } from '../services/AuthService';
import { ConfigService } from '../services/ConfigService';
import { S3Service } from '../services/S3Service';

/**
 * Get local IP address for mobile access
 */
export function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      // Look for IPv4 non-internal address (typically 192.168.x.x)
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }

  return 'localhost';
}

/**
 * Display server startup information
 */
export function displayStartupInfo(port: number, localIP: string): void {
  console.log('\n🎨 Blog Writing Assistant Server');
  console.log('================================\n');
  console.log('📍 Access URLs:');
  console.log(`   PC:     https://localhost:${port}`);
  console.log(`   Mobile: https://${localIP}:${port}`);
  console.log('\n⚠️  Note: You may need to accept the self-signed certificate warning');
  console.log('');
}

/**
 * Start server and initialize services
 */
export async function startServer(
  server: HTTPSServer,
  port: number,
  configService: ConfigService,
  s3Service: S3Service
): Promise<void> {
  return new Promise((resolve) => {
    server.listen(port, async () => {
      const localIP = getLocalIPAddress();
      displayStartupInfo(port, localIP);

      console.log('🚀 Server started successfully\n');

      // Auto-load config from OS keychain on startup
      try {
        const credentials = await configService.loadConfig();
        if (credentials) {
          console.log('✓ AWS credentials loaded from OS keychain');
          const initialized = await s3Service.initialize(credentials);
          if (initialized) {
            console.log('✓ S3 service initialized successfully');
          } else {
            console.log('⚠ S3 service initialization failed');
          }
        } else {
          console.log('ℹ No AWS credentials found - initial setup required');
        }
      } catch (error) {
        console.error('⚠ Failed to load credentials:', error);
      }

      console.log('\n✨ Ready to accept connections\n');
      resolve();
    });
  });
}

/**
 * Gracefully shutdown server and cleanup resources
 */
export async function shutdownServer(
  server: HTTPSServer,
  io: SocketIOServer,
  authService: AuthService
): Promise<void> {
  console.log('\n🛑 Shutting down server...');

  // Invalidate all tokens on shutdown
  authService.invalidateAllTokens();
  console.log('✓ All tokens invalidated');

  // Cleanup auth service
  authService.destroy();
  console.log('✓ Auth service cleaned up');

  // Close WebSocket connections
  io.close(() => {
    console.log('✓ WebSocket connections closed');
  });

  // Close HTTP server
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('⚠ Forced shutdown after timeout');
      reject(new Error('Shutdown timeout'));
    }, 10000);

    server.close((err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('✗ Error closing server:', err);
        reject(err);
      } else {
        console.log('✓ Server closed');
        console.log('👋 Goodbye!\n');
        resolve();
      }
    });
  });
}
