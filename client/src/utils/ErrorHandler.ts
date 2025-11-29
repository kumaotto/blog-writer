/**
 * Client-side Error Handler
 * Provides error handling, classification, and user notifications
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

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    retryable: boolean = false,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.retryable = retryable;
    this.userMessage = userMessage || message;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error classification
export class ErrorClassifier {
  static classify(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const errorMessage = error?.message || 'Unknown error occurred';
    const status = error?.status || error?.statusCode;

    // Authentication errors (401, 403)
    if (
      status === 401 ||
      status === 403 ||
      errorMessage.includes('token') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('unauthorized')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.AUTHENTICATION,
        false,
        'Your session has expired. Please scan the QR code again.'
      );
    }

    // S3 errors
    if (
      errorMessage.includes('S3') ||
      errorMessage.includes('AWS') ||
      errorMessage.includes('upload') ||
      errorMessage.includes('bucket')
    ) {
      const retryable = status === 503 || errorMessage.includes('timeout');
      return new AppError(
        errorMessage,
        ErrorType.S3,
        retryable,
        retryable
          ? 'S3 service is temporarily unavailable. Retrying...'
          : 'Failed to access S3 storage. Please check your configuration.'
      );
    }

    // File system errors
    if (
      errorMessage.includes('file') ||
      errorMessage.includes('save') ||
      errorMessage.includes('read')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.FILE_SYSTEM,
        false,
        'File operation failed. Please try again.'
      );
    }

    // Network errors
    if (
      status === 0 ||
      status === 503 ||
      status === 504 ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.NETWORK,
        true,
        'Network error. Please check your connection and try again.'
      );
    }

    // WebSocket errors
    if (
      errorMessage.includes('websocket') ||
      errorMessage.includes('socket')
    ) {
      return new AppError(
        errorMessage,
        ErrorType.WEBSOCKET,
        true,
        'Connection lost. Reconnecting...'
      );
    }

    // Validation errors (400)
    if (status === 400 || errorMessage.includes('invalid') || errorMessage.includes('required')) {
      return new AppError(
        errorMessage,
        ErrorType.VALIDATION,
        false,
        errorMessage
      );
    }

    // Default unknown error
    return new AppError(
      errorMessage,
      ErrorType.UNKNOWN,
      false,
      'An unexpected error occurred. Please try again.'
    );
  }
}

// Retry handler with exponential backoff
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    onRetry?: (attempt: number, error: AppError) => void
  ): Promise<T> {
    let lastError: AppError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const appError = ErrorClassifier.classify(error);
        lastError = appError;

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
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;

        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms`
        );

        if (onRetry) {
          onRetry(attempt + 1, appError);
        }

        await this.sleep(totalDelay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global error handler
export class ErrorHandler {
  private static errorListeners: Array<(error: AppError) => void> = [];

  static handle(error: any, context: string = 'Unknown'): AppError {
    const appError = ErrorClassifier.classify(error);

    // Log error details
    console.error(`[${context}] Error:`, {
      type: appError.type,
      message: appError.message,
      userMessage: appError.userMessage,
      retryable: appError.retryable,
    });

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(appError);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });

    return appError;
  }

  static addListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  static clearListeners(): void {
    this.errorListeners = [];
  }
}

// Fetch wrapper with error handling
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit,
  context: string = 'API Call'
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    throw ErrorHandler.handle(error, context);
  }
}

// Fetch with retry
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  context: string = 'API Call'
): Promise<Response> {
  return RetryHandler.withRetry(
    () => fetchWithErrorHandling(url, options, context),
    maxRetries
  );
}
