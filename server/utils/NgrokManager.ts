import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

interface NgrokTunnel {
  public_url: string;
  proto: string;
  config: {
    addr: string;
  };
}

interface NgrokApiResponse {
  tunnels: NgrokTunnel[];
}

/**
 * NgrokManager handles automatic ngrok tunnel management
 * Ensures PUBLIC_URL is set by auto-starting ngrok when needed
 */
export class NgrokManager {
  private static ngrokProcess: ChildProcess | null = null;

  /**
   * Ensures ngrok is running if PUBLIC_URL is not set
   * @param port - The local port to tunnel
   * @returns Promise that resolves when ngrok is ready or PUBLIC_URL is already set
   * @throws Error if ngrok is not installed or fails to start
   */
  static async ensureNgrokRunning(port: number): Promise<void> {
    // Check if PUBLIC_URL is already set
    if (process.env.PUBLIC_URL) {
      console.log(`✅ Using provided PUBLIC_URL: ${process.env.PUBLIC_URL}`);
      return;
    }

    console.log('📡 PUBLIC_URL not set, starting ngrok automatically...');

    // Check if ngrok is installed
    const isInstalled = await this.isNgrokInstalled();
    if (!isInstalled) {
      throw new Error(
        'ngrok is not installed. Please install it:\n' +
        '   brew install ngrok  # macOS\n' +
        '   or visit: https://ngrok.com/download'
      );
    }

    // Start ngrok process
    await this.startNgrokProcess(port);

    // Wait for ngrok API and get URL
    const url = await this.getNgrokUrl();

    // Set PUBLIC_URL
    process.env.PUBLIC_URL = url;

    console.log(`✅ ngrok tunnel established: ${url}`);
    console.log('📱 Server will use ngrok URL for QR codes and external access');
  }

  /**
   * Stops the ngrok process if it was started by this manager
   * @returns Promise that resolves when ngrok is stopped
   */
  static async stop(): Promise<void> {
    if (!this.ngrokProcess) {
      console.log('ℹ️  No ngrok process to stop');
      return;
    }

    console.log('🛑 Stopping ngrok tunnel...');

    return new Promise((resolve) => {
      const killTimeout = setTimeout(() => {
        if (this.ngrokProcess) {
          this.ngrokProcess.kill('SIGKILL');
          console.log('⚠️  Force killed ngrok process after timeout');
        }
        resolve();
      }, 5000);

      this.ngrokProcess!.once('exit', () => {
        clearTimeout(killTimeout);
        console.log('✅ ngrok tunnel closed');
        this.ngrokProcess = null;
        resolve();
      });

      this.ngrokProcess!.kill('SIGTERM');
    });
  }

  /**
   * Checks if ngrok command is available
   * @returns true if ngrok is installed
   */
  static async isNgrokInstalled(): Promise<boolean> {
    try {
      await execAsync('ngrok version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Spawns ngrok process
   * @param port - The local port to tunnel
   */
  private static async startNgrokProcess(port: number): Promise<void> {
    console.log(`📡 Starting ngrok tunnel on port ${port}...`);

    return new Promise((resolve, reject) => {
      this.ngrokProcess = spawn('ngrok', ['http', port.toString(), '--log=stdout'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.ngrokProcess.on('error', (error) => {
        reject(new Error(`Failed to start ngrok: ${error.message}`));
      });

      // Give ngrok a moment to start
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Retrieves tunnel URL from ngrok API (http://localhost:4040/api/tunnels)
   * @returns The public ngrok URL
   */
  private static async getNgrokUrl(): Promise<string> {
    const maxRetries = 10;
    const baseDelay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const url = await this.fetchNgrokApiUrl();
        if (url) {
          return url;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('ngrok API did not become available after maximum retries');
        }
        // Exponential backoff
        await this.sleep(baseDelay * Math.pow(2, i));
      }
    }

    throw new Error('ngrok API did not become available');
  }

  /**
   * Fetches URL from ngrok API
   * @returns The public URL or null if not ready
   */
  private static async fetchNgrokApiUrl(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:4040/api/tunnels', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`ngrok API returned status ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response: NgrokApiResponse = JSON.parse(data);
            const httpsTunnel = response.tunnels.find((t) => t.proto === 'https');
            if (httpsTunnel) {
              resolve(httpsTunnel.public_url);
            } else {
              reject(new Error('No HTTPS tunnel found in ngrok API response'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse ngrok API response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Sleep utility
   * @param ms - Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
