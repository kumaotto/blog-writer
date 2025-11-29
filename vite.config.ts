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
    https: {
      key: fs.readFileSync(path.join(os.homedir(), '.blog-assistant', 'certs', 'key.pem')),
      cert: fs.readFileSync(path.join(os.homedir(), '.blog-assistant', 'certs', 'cert.pem')),
    },
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:3001', // Use 127.0.0.1 instead of localhost for better compatibility
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://127.0.0.1:3001', // Use 127.0.0.1 instead of localhost for better compatibility
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
