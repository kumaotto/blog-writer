import fs from 'fs/promises';
import path from 'path';

interface RecentFile {
  path: string;
  name: string;
  lastModified: Date;
}

/**
 * FileService - Local file system operations
 */
export class FileService {
  private recentFiles: Set<string> = new Set();
  private readonly maxRecentFiles = 10;

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Track this file as recently accessed
      this.recentFiles.add(filePath);
      
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Failed to read file');
    }
  }

  /**
   * Save file content
   */
  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      // Create parent directories if they don't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, content, 'utf8');
      
      // Track this file as recently accessed
      this.recentFiles.add(filePath);
    } catch (error) {
      console.error('Failed to save file:', error);
      throw new Error('Failed to save file');
    }
  }

  /**
   * List recently accessed files
   */
  async listRecentFiles(): Promise<RecentFile[]> {
    const files: RecentFile[] = [];

    for (const filePath of this.recentFiles) {
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          files.push({
            path: filePath,
            name: path.basename(filePath),
            lastModified: stats.mtime,
          });
        }
      } catch (error) {
        // File no longer exists, remove from recent files
        this.recentFiles.delete(filePath);
      }
    }

    // Sort by last modified date (most recent first)
    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    // Limit to max recent files
    const limitedFiles = files.slice(0, this.maxRecentFiles);

    // Update recent files set to only include files that still exist
    this.recentFiles = new Set(limitedFiles.map((f) => f.path));

    return limitedFiles;
  }
}

