import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default defineConfig({
  plugins: [react()],
  root: './client',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (allows iPhone access)
    port: 3000,
    // Temporarily disable HTTPS for ngrok compatibility
    // https: {
    //   key: fs.readFileSync(path.join(os.homedir(), '.blog-assistant', 'certs', 'key.pem')),
    //   cert: fs.readFileSync(path.join(os.homedir(), '.blog-assistant', 'certs', 'cert.pem')),
    // },
    // Allow ngrok hosts
    allowedHosts: [
      'localhost',
      '.ngrok.io',
      '.ngrok-free.app',
    ],
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
            // Suppress EPIPE, ECONNRESET, and other common WebSocket errors
            if (
              err.code === 'EPIPE' || 
              err.code === 'ECONNRESET' ||
              err.code === 'ECONNABORTED' ||
              err.errno === -32
            ) {
              return;
            }
            console.error('[Vite Proxy] WebSocket error:', err.message);
          });
          
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: any) => {
              // Suppress socket errors
              if (
                err.code === 'EPIPE' || 
                err.code === 'ECONNRESET' ||
                err.errno === -32
              ) {
                return;
              }
            });
          });
        },
      },
    },
  },
});
