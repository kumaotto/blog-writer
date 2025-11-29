/**
 * Error Handler Utility
 * Provides centralized error handling with classification, retry logic, and user-friendly messages
 */

// Error types
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  S3 = 'S3',
  FILE_SYSTEM = 'FILE_SYSTEM',
  WEBSOCKET = 'WEBSOCKET',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

// Custom error class with type and retry information
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly retryable: boolean;
  public readonly statusCode: number;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    retryable: boolean = false,
    statusCode: number = 500,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error classification helper
export class ErrorClassifier {
  static classify(error: any): AppError {
    // Already classified
    if (error instanceof AppError) {
      return error;
    }

    const errorMessage = error?.message || 'Unknown error occurred';
    const errorCode = error?.code || error?.name || '';

    // Authentication errors
    if (
      errorMessage.includes('token') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('unauthorized') ||
      errorCode === 'EAUTH'
    ) {
      return new AppError(
        errorMessage,
        ErrorType.AUTHENTICATION,
        false,
        401,
        error
      );
    }

    // S3 errors
    if (
      errorMessage.includes('S3') ||
      errorMessage.includes('AWS') ||
      errorMessage.includes('bucket') ||
      errorCode.startsWith('S3')
    ) {
      const retryable = this.isS3ErrorRetryable(errorCode);
      return new AppError(
        errorMessage,
        ErrorType.S3,
        retryable,
        retryable ? 503 : 500,
        error
      );
    }

    // File system errors
    if (
      errorCode === 'ENOENT' ||
      errorCode === 'EACCES' ||
      errorCode === 'EPERM' ||
      errorCode === 'EISDIR' ||
      errorMessage.includes('file') ||
      errorMessage.includes('directory')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.FILE_SYSTEM,
        false,
        errorCode === 'ENOENT' ? 404 : 500,
        error
      );
    }

    // Network errors
    if (
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ENETUNREACH' ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.NETWORK,
        true,
        503,
        error
      );
    }

    // WebSocket errors
    if (
      errorMessage.includes('websocket') ||
      errorMessage.includes('socket') ||
      errorCode === 'WS_ERROR'
    ) {
      return new AppError(
        errorMessage,
        ErrorType.WEBSOCKET,
        true,
        503,
        error
      );
    }

    // Validation errors
    if (
      errorMessage.includes('required') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.VALIDATION,
        false,
        400,
        error
      );
    }

    // Default unknown error
    return new AppError(
      errorMessage,
      ErrorType.UNKNOWN,
      false,
      500,
      error
    );
  }

  private static isS3ErrorRetryable(errorCode: string): boolean {
    const retryableCodes = [
      'RequestTimeout',
      'RequestTimeoutException',
      'PriorRequestNotComplete',
      'ConnectionError',
      'NetworkingError',
      'ThrottlingException',
      'TooManyRequestsException',
      'ServiceUnavailable',
      'SlowDown',
    ];
    return retryableCodes.some(code => errorCode.includes(code));
  }
}

// Retry logic with exponential backoff
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const appError = ErrorClassifier.classify(error);

        // Don't retry if error is not retryable
        if (!appError.retryable) {
          throw appError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw appError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
        const totalDelay = delay + jitter;

        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms for error: ${appError.message}`
        );

        await this.sleep(totalDelay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// User-friendly error messages
export class ErrorMessageFormatter {
  static format(error: AppError): string {
    switch (error.type) {
      case ErrorType.AUTHENTICATION:
        return this.formatAuthError(error);
      case ErrorType.S3:
        return this.formatS3Error(error);
      case ErrorType.FILE_SYSTEM:
        return this.formatFileSystemError(error);
      case ErrorType.WEBSOCKET:
        return this.formatWebSocketError(error);
      case ErrorType.NETWORK:
        return this.formatNetworkError(error);
      case ErrorType.VALIDATION:
        return error.message;
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private static formatAuthError(error: AppError): string {
    if (error.message.includes('expired')) {
      return 'Your session has expired. Please scan the QR code again.';
    }
    if (error.message.includes('invalid')) {
      return 'Invalid authentication. Please scan the QR code again.';
    }
    return 'Authentication failed. Please try again.';
  }

  private static formatS3Error(error: AppError): string {
    if (error.message.includes('credentials')) {
      return 'AWS credentials are invalid. Please check your configuration.';
    }
    if (error.message.includes('bucket')) {
      return 'S3 bucket not found or inaccessible. Please check your configuration.';
    }
    if (error.message.includes('permission')) {
      return 'Permission denied. Please check your AWS IAM permissions.';
    }
    if (error.retryable) {
      return 'S3 service is temporarily unavailable. Retrying...';
    }
    return 'Failed to access S3 storage. Please check your configuration.';
  }

  private static formatFileSystemError(error: AppError): string {
    const originalError = error.originalError as any;
    const code = originalError?.code;

    if (code === 'ENOENT') {
      return 'File not found. Please check the file path.';
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return 'Permission denied. Please check file permissions.';
    }
    if (code === 'EISDIR') {
      return 'Expected a file but found a directory.';
    }
    return 'File system error. Please try again.';
  }

  private static formatWebSocketError(error: AppError): string {
    if (error.message.includes('connection')) {
      return 'Connection lost. Reconnecting...';
    }
    return 'Real-time communication error. Please refresh the page.';
  }

  private static formatNetworkError(error: AppError): string {
    const originalError = error.originalError as any;
    const code = originalError?.code;

    if (code === 'ECONNREFUSED') {
      return 'Cannot connect to server. Please check if the server is running.';
    }
    if (code === 'ETIMEDOUT') {
      return 'Connection timed out. Please check your network connection.';
    }
    if (code === 'ENOTFOUND') {
      return 'Server not found. Please check the URL.';
    }
    return 'Network error. Please check your connection and try again.';
  }
}

// Global error handler
export class ErrorHandler {
  static handle(error: any, context: string = 'Unknown'): AppError {
    const appError = ErrorClassifier.classify(error);

    // Log error details (server-side)
    console.error(`[${context}] Error Type: ${appError.type}`, {
      message: appError.message,
      retryable: appError.retryable,
      statusCode: appError.statusCode,
      stack: appError.stack,
    });

    return appError;
  }

  static handleAsync(error: any, context: string = 'Unknown'): Promise<AppError> {
    return Promise.resolve(this.handle(error, context));
  }
}
