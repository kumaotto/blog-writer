/**
 * Upload queue manager for parallel image uploads
 * Limits concurrent uploads to prevent overwhelming the server
 */

interface UploadTask {
  id: string;
  file: File;
  articleId: string;
  onProgress: (progress: number) => void;
  onSuccess: (url: string) => void;
  onError: (error: string) => void;
}

class UploadQueue {
  private queue: UploadTask[] = [];
  private activeUploads: Set<string> = new Set();
  private maxConcurrent: number = 3;

  /**
   * Add upload task to queue
   */
  addTask(task: UploadTask): void {
    this.queue.push(task);
    this.processQueue();
  }

  /**
   * Process queued uploads
   */
  private async processQueue(): Promise<void> {
    // Check if we can start more uploads
    while (this.activeUploads.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeUploads.add(task.id);
      this.uploadImage(task).finally(() => {
        this.activeUploads.delete(task.id);
        this.processQueue(); // Process next in queue
      });
    }
  }

  /**
   * Upload single image
   */
  private async uploadImage(task: UploadTask): Promise<void> {
    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(task.file);
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        task.onProgress(Math.min(90, Math.random() * 30 + 60));
      }, 200);

      const response = await fetch(`${window.location.origin}/api/images/upload-mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: fileBase64,
          mimeType: task.file.type,
          articleId: task.articleId,
        }),
        credentials: 'include',
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please scan the QR code again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      task.onProgress(100);
      task.onSuccess(data.url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      task.onError(errorMessage);
    }
  }

  /**
   * Get number of active uploads
   */
  getActiveCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Get number of queued uploads
   */
  getQueuedCount(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueue();
