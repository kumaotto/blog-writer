# Project Overview

## Purpose
Blog Writing Assistant - A local web application that enables seamless image transfer from smartphone to PC markdown editor for WordPress blog writing. Users can upload images from their phone via browser, which are automatically inserted into the PC editor in markdown format.

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + HTTPS
- **Frontend**: React + TypeScript + Vite
- **Editor**: CodeMirror 6
- **Markdown Parser**: marked.js
- **Storage**: AWS S3 (images), Local filesystem (markdown files)
- **Security**: HTTPS (self-signed cert), Token-based auth, OS Keychain (keytar)
- **Real-time**: WebSocket (Socket.IO)
- **QR Code**: qrcode library

## Project Structure
- `server/` - Backend Express server
  - `services/` - Business logic (AuthService, S3Service, FileService, ConfigService, WebSocketService)
  - `__tests__/` - Backend unit tests
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions (certificate generation)
- `client/` - Frontend React application
  - `src/components/` - React components
- `tests/` - Integration/E2E tests
- `.kiro/specs/blog-writing-assistant/` - Spec documents (requirements, design, tasks)

## Key Features
- QR code authentication for secure smartphone access
- Multi-tab article editing
- Real-time image insertion via WebSocket
- Auto-save with LocalStorage backup
- AWS S3 image storage
- WordPress Jetpack Markdown compatibility
