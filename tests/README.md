# Integration and Security Tests

This directory contains comprehensive integration and security tests for the Blog Writing Assistant application.

## Test Files

### 1. integration.test.ts
**Purpose**: Frontend & Backend Integration Tests

Tests the integration between frontend and backend components:
- **API Integration**: Authentication flow, configuration management, file operations, image management
- **WebSocket Communication**: Connection establishment, authentication, article list synchronization, image insert events
- **Error Handling**: 404 errors, malformed JSON, rate limiting, CORS errors, missing authentication
- **End-to-End Scenarios**: Complete authentication flow, configuration and S3 connection test flow

### 2. e2e-flows.test.ts
**Purpose**: End-to-End User Flow Tests

Tests complete user journeys from start to finish:
- **Complete User Journey**: First launch → AWS configuration → article creation → image upload → save → WordPress export
- **QR Code Authentication Flow**: Full cycle from QR generation to session token usage
- **Multiple Article Tabs**: Handling multiple articles simultaneously, article switching, concurrent image uploads
- **Error Recovery**: Network interruption recovery, file save failures, session expiration

### 3. security.test.ts
**Purpose**: Security and Vulnerability Tests

Tests security measures and protections:
- **Token Expiration**: QR token (5 min), session token (1 hour), token invalidation on server restart
- **Unauthorized Access**: Requests without authentication, invalid tokens, malformed tokens, WebSocket security
- **HTTPS Communication**: TLS enabled, secure WebSocket (WSS), HTTP rejection
- **CORS Security**: Localhost-only origins, credential requirements, preflight requests
- **Rate Limiting**: QR token generation (5/min), image uploads (10/min)
- **Input Validation**: AWS credentials, file paths, image file types, XSS prevention
- **Token Security**: Cryptographic security, no token exposure in errors, memory-only storage
- **Session Management**: Session isolation, session fixation prevention

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test tests/integration.test.ts
npm test tests/e2e-flows.test.ts
npm test tests/security.test.ts
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run in watch mode
```bash
npm run test:watch
```

## Test Coverage

The tests cover all requirements from the specification:

### Requirement 1: Image Upload from Mobile
- ✅ Article tab selection
- ✅ Image upload to S3
- ✅ Automatic markdown insertion
- ✅ Error handling

### Requirement 2: Markdown Editor
- ✅ Real-time preview
- ✅ Drag & drop image upload
- ✅ File operations (open, save)
- ✅ Multiple article tabs

### Requirement 3: Image Gallery
- ✅ Image listing
- ✅ Image deletion
- ✅ URL copying
- ✅ Full-size preview

### Requirement 4: Local Server
- ✅ HTTPS server startup
- ✅ Network accessibility
- ✅ Graceful shutdown

### Requirement 5: WordPress Integration
- ✅ Markdown copy
- ✅ Jetpack Markdown compatibility
- ✅ Export functionality

### Requirement 6: AWS Configuration
- ✅ Initial setup
- ✅ Credential storage (OS keychain)
- ✅ S3 connection test
- ✅ Configuration updates

### Requirement 7: Security
- ✅ QR code authentication
- ✅ Session token management
- ✅ Token expiration (QR: 5min, Session: 1hr)
- ✅ HTTPS communication
- ✅ Rate limiting
- ✅ CORS protection

## Test Environment

Tests use:
- **supertest**: HTTP assertions
- **socket.io-client**: WebSocket testing
- **jest**: Test framework
- **ts-jest**: TypeScript support

## Notes

- Tests use self-signed certificates for HTTPS (rejectUnauthorized: false)
- Some tests may fail if AWS credentials are not configured (expected behavior)
- Rate limiting tests may be affected by parallel test execution
- Temporary files are created in system temp directory and cleaned up after tests

## Continuous Integration

These tests should be run:
- Before every commit
- In CI/CD pipeline
- Before production deployment
- After dependency updates

## Future Improvements

- Add performance benchmarks
- Add load testing for concurrent users
- Add browser-based E2E tests with Playwright/Cypress
- Add visual regression tests
- Add accessibility tests
