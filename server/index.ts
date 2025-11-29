import { createServer } from './server';
import { startServer, shutdownServer } from './utils/serverUtils';
import { NgrokManager } from './utils/NgrokManager';

// Main startup function
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 Starting Blog Writing Assistant Server');
    console.log('='.repeat(60));

    // Ensure ngrok is running (auto-start if PUBLIC_URL not set)
    await NgrokManager.ensureNgrokRunning(3001);

    // Log final PUBLIC_URL
    console.log('📝 PUBLIC_URL:', process.env.PUBLIC_URL || 'not set');
    console.log('='.repeat(60));

    // Create server instance
    const { server, port, authService, configService, s3Service, io } = createServer({ port: 3001 });

    // Store server components for shutdown
    global.serverComponents = { server, io, authService };

    // Start server
    await startServer(server, port, configService, s3Service);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main();

// Graceful shutdown handler
const shutdown = async () => {
  try {
    // Stop ngrok first
    await NgrokManager.stop();

    // Then shutdown server
    const { server, io, authService } = global.serverComponents || {};
    if (server && io && authService) {
      await shutdownServer(server, io, authService);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});
