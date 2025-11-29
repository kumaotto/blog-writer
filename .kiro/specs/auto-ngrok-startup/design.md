# Design Document

## Overview

This feature adds automatic ngrok tunnel management to the Blog Writing Assistant server. When PUBLIC_URL is not set, the system will automatically start ngrok, retrieve the tunnel URL, and configure the server to use it. This eliminates manual setup steps and ensures consistent external access across different development environments.

The design introduces a new NgrokManager module that handles ngrok lifecycle management (start, monitor, shutdown) and integrates seamlessly with the existing server startup flow.

## Architecture

### High-Level Flow

```
Server Startup
    ↓
Check PUBLIC_URL
    ↓
    ├─ Set? → Use provided URL → Continue startup
    ↓
    └─ Not set? → NgrokManager.start()
                      ↓
                  Check ngrok installed
                      ↓
                  Spawn ngrok process
                      ↓
                  Wait for tunnel URL
                      ↓
                  Set PUBLIC_URL
                      ↓
                  Continue startup
```

### Component Integration

The NgrokManager will be called from `server/index.ts` before the server starts listening. This ensures PUBLIC_URL is set before any QR codes are generated or URLs are displayed.

```typescript
// server/index.ts (modified flow)
import { NgrokManager } from './utils/NgrokManager';

// Check and auto-start ngrok if needed
await NgrokManager.ensureNgrokRunning(3001);

// Then proceed with normal server startup
const { server, port, ... } = createServer({ port: 3001 });
```

## Components and Interfaces

### NgrokManager Module

**Location:** `server/utils/NgrokManager.ts`

**Responsibilities:**
- Check if ngrok is installed
- Start ngrok process with specified port
- Retrieve tunnel URL from ngrok API
- Set PUBLIC_URL environment variable
- Manage ngrok process lifecycle
- Clean shutdown of ngrok on server exit

**Public Interface:**

```typescript
export class NgrokManager {
  /**
   * Ensures ngrok is running if PUBLIC_URL is not set
   * @param port - The local port to tunnel
   * @returns Promise that resolves when ngrok is ready or PUBLIC_URL is already set
   * @throws Error if ngrok is not installed or fails to start
   */
  static async ensureNgrokRunning(port: number): Promise<void>;

  /**
   * Stops the ngrok process if it was started by this manager
   * @returns Promise that resolves when ngrok is stopped
   */
  static async stop(): Promise<void>;

  /**
   * Checks if ngrok command is available
   * @returns true if ngrok is installed
   */
  static isNgrokInstalled(): Promise<boolean>;
}
```

**Internal Methods:**

```typescript
class NgrokManager {
  private static ngrokProcess: ChildProcess | null = null;
  private static ngrokUrl: string | null = null;

  /**
   * Spawns ngrok process
   */
  private static async startNgrokProcess(port: number): Promise<void>;

  /**
   * Retrieves tunnel URL from ngrok API (http://localhost:4040/api/tunnels)
   */
  private static async getNgrokUrl(): Promise<string>;

  /**
   * Waits for ngrok API to be available
   */
  private static async waitForNgrokApi(maxRetries: number): Promise<void>;

  /**
   * Kills ngrok process
   */
  private static async killNgrokProcess(): Promise<void>;
}
```

### Modified Server Startup Flow

**Location:** `server/index.ts`

The main entry point will be modified to call NgrokManager before starting the server:

```typescript
// Before server creation
console.log('🚀 Starting Blog Writing Assistant Server');

// Ensure ngrok is running (auto-start if PUBLIC_URL not set)
await NgrokManager.ensureNgrokRunning(3001);

// Log final PUBLIC_URL
console.log('📝 PUBLIC_URL:', process.env.PUBLIC_URL);

// Create and start server
const { server, port, ... } = createServer({ port: 3001 });
```

### Shutdown Integration

**Location:** `server/index.ts` (shutdown handler)

The shutdown handler will be updated to stop ngrok:

```typescript
const shutdown = async () => {
  try {
    // Stop ngrok first
    await NgrokManager.stop();
    
    // Then shutdown server
    await shutdownServer(server, io, authService);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};
```

## Data Models

### NgrokTunnelResponse

The ngrok API returns tunnel information in this format:

```typescript
interface NgrokTunnel {
  public_url: string;  // e.g., "https://abc123.ngrok.io"
  proto: string;       // "https"
  config: {
    addr: string;      // "http://localhost:3001"
  };
}

interface NgrokApiResponse {
  tunnels: NgrokTunnel[];
}
```

### Environment Variables

```typescript
// Set by NgrokManager when auto-starting
process.env.PUBLIC_URL: string | undefined
```

## Error Handling

### ngrok Not Installed

```typescript
if (!(await NgrokManager.isNgrokInstalled())) {
  console.error('❌ ngrok is not installed. Please install it:');
  console.error('   brew install ngrok  # macOS');
  console.error('   or visit: https://ngrok.com/download');
  process.exit(1);
}
```

### ngrok Fails to Start

```typescript
try {
  await NgrokManager.startNgrokProcess(port);
} catch (error) {
  console.error('❌ Failed to start ngrok:', error.message);
  console.error('   Please check if port 3001 is available');
  process.exit(1);
}
```

### ngrok API Timeout

```typescript
// Retry logic with exponential backoff
const maxRetries = 10;
const baseDelay = 500; // ms

for (let i = 0; i < maxRetries; i++) {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    if (response.ok) return;
  } catch (error) {
    if (i === maxRetries - 1) {
      throw new Error('ngrok API did not become available');
    }
    await sleep(baseDelay * Math.pow(2, i));
  }
}
```

### Graceful Shutdown Timeout

```typescript
// Force kill if graceful shutdown takes too long
const killTimeout = setTimeout(() => {
  if (NgrokManager.ngrokProcess) {
    NgrokManager.ngrokProcess.kill('SIGKILL');
    console.log('⚠️  Force killed ngrok process');
  }
}, 5000);

// Clear timeout if graceful shutdown succeeds
NgrokManager.ngrokProcess.on('exit', () => {
  clearTimeout(killTimeout);
});
```

## Testing Strategy

### Unit Tests

**Location:** `server/__tests__/NgrokManager.test.ts`

Test cases:
1. `isNgrokInstalled()` returns true when ngrok is available
2. `isNgrokInstalled()` returns false when ngrok is not available
3. `ensureNgrokRunning()` skips startup when PUBLIC_URL is set
4. `ensureNgrokRunning()` starts ngrok when PUBLIC_URL is not set
5. `ensureNgrokRunning()` throws error when ngrok is not installed
6. `getNgrokUrl()` retrieves URL from ngrok API
7. `getNgrokUrl()` retries on API failure
8. `stop()` kills ngrok process
9. `stop()` handles case when no process is running
10. Force kill after timeout works correctly

### Integration Tests

**Location:** `server/__tests__/integration/NgrokIntegration.test.ts`

Test cases:
1. Server starts with ngrok when PUBLIC_URL not set
2. Server uses provided PUBLIC_URL when set
3. Server shuts down ngrok on exit
4. QR codes use ngrok URL after auto-start

### Manual Testing Checklist

1. Clone repo on new machine without PUBLIC_URL
2. Run `npm run dev:server`
3. Verify ngrok starts automatically
4. Verify PUBLIC_URL is set to ngrok URL
5. Verify QR codes display ngrok URL
6. Stop server with Ctrl+C
7. Verify ngrok process terminates
8. Set PUBLIC_URL manually and restart
9. Verify ngrok does not auto-start
10. Uninstall ngrok temporarily
11. Verify clear error message appears

## Implementation Notes

### Dependencies

No new npm packages required. Uses Node.js built-in modules:
- `child_process` for spawning ngrok
- `http` for querying ngrok API
- `util.promisify` for async exec

### ngrok Command

```bash
ngrok http 3001 --log=stdout
```

This command:
- Tunnels port 3001
- Outputs logs to stdout for monitoring
- Uses default ngrok configuration

### API Endpoint

ngrok exposes a local API at `http://localhost:4040/api/tunnels` that returns tunnel information in JSON format.

### Process Management

The ngrok process will be stored as a static property of NgrokManager to ensure it can be accessed during shutdown from any part of the application.

### Logging Strategy

All ngrok-related logs will use emoji prefixes for consistency:
- 📡 Starting ngrok
- ✅ ngrok ready
- ❌ ngrok error
- 🛑 Stopping ngrok

## Security Considerations

1. **ngrok URL Exposure**: The ngrok URL is public and should only be used for development
2. **No Authentication**: ngrok tunnels are open by default; rely on application-level auth
3. **HTTPS**: ngrok provides HTTPS by default, ensuring encrypted communication
4. **Process Isolation**: ngrok runs as a separate process with no access to application memory

## Performance Considerations

1. **Startup Time**: Adding ngrok adds ~2-3 seconds to server startup
2. **API Polling**: Exponential backoff prevents excessive API calls during startup
3. **Memory**: ngrok process uses ~20-30MB RAM
4. **Network**: Minimal overhead; ngrok only forwards requests

## Future Enhancements

1. Support for custom ngrok configuration files
2. Support for ngrok authtoken for persistent URLs
3. Option to use alternative tunneling services (localtunnel, serveo)
4. Automatic ngrok installation if missing
5. Health check endpoint to verify tunnel is active
