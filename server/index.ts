import { createServer } from './server';
import { startServer, shutdownServer } from './utils/serverUtils';

// Create server instance
const { server, port, authService, configService, s3Service, io } = createServer({ port: 3001 });

// Start server
startServer(server, port, configService, s3Service).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown handler
const shutdown = async () => {
  try {
    await shutdownServer(server, io, authService);
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
