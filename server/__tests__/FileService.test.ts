import { FileService } from '../services/FileService';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileService', () => {
  let fileService: FileService;
  let testDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), 'blog-assistant-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'test.md');
      const content = '# Test Markdown\n\nThis is a test.';
      await fs.writeFile(filePath, content, 'utf8');

      const result = await fileService.readFile(filePath);

      expect(result).toBe(content);
    });

    it('should throw error if file does not exist', async () => {
      const filePath = path.join(testDir, 'non-existent.md');

      await expect(fileService.readFile(filePath)).rejects.toThrow('Failed to read file');
    });

    it('should throw error if path is a directory', async () => {
      await expect(fileService.readFile(testDir)).rejects.toThrow('Failed to read file');
    });
  });

  describe('saveFile', () => {
    it('should save file content', async () => {
      const filePath = path.join(testDir, 'new-file.md');
      const content = '# New File\n\nContent here.';

      await fileService.saveFile(filePath, content);

      const savedContent = await fs.readFile(filePath, 'utf8');
      expect(savedContent).toBe(content);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDir, 'subdir', 'nested', 'file.md');
      const content = '# Nested File';

      await fileService.saveFile(filePath, content);

      const savedContent = await fs.readFile(filePath, 'utf8');
      expect(savedContent).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'existing.md');
      await fs.writeFile(filePath, 'Old content', 'utf8');

      const newContent = 'New content';
      await fileService.saveFile(filePath, newContent);

      const savedContent = await fs.readFile(filePath, 'utf8');
      expect(savedContent).toBe(newContent);
    });

    it('should throw error if save fails', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/file.md';

      await expect(fileService.saveFile(invalidPath, 'content')).rejects.toThrow(
        'Failed to save file'
      );
    });
  });

  describe('listRecentFiles', () => {
    it('should list recently modified files', async () => {
      // Create test files with different modification times
      const file1 = path.join(testDir, 'file1.md');
      const file2 = path.join(testDir, 'file2.md');
      const file3 = path.join(testDir, 'file3.md');

      await fs.writeFile(file1, 'Content 1', 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeFile(file2, 'Content 2', 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeFile(file3, 'Content 3', 'utf8');

      // Track these files
      await fileService.readFile(file1);
      await fileService.readFile(file2);
      await fileService.readFile(file3);

      const result = await fileService.listRecentFiles();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].path).toBe(file3); // Most recent
      expect(result[0].name).toBe('file3.md');
      expect(result[0].lastModified).toBeDefined();
      expect(typeof result[0].lastModified.getTime).toBe('function');
    });

    it('should return empty array if no files have been accessed', async () => {
      const result = await fileService.listRecentFiles();

      expect(result).toEqual([]);
    });

    it('should limit results to 10 most recent files', async () => {
      // Create 15 files
      for (let i = 0; i < 15; i++) {
        const filePath = path.join(testDir, `file${i}.md`);
        await fs.writeFile(filePath, `Content ${i}`, 'utf8');
        await fileService.readFile(filePath);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const result = await fileService.listRecentFiles();

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle files that no longer exist', async () => {
      const filePath = path.join(testDir, 'temp.md');
      await fs.writeFile(filePath, 'Content', 'utf8');
      await fileService.readFile(filePath);

      // Delete the file
      await fs.unlink(filePath);

      const result = await fileService.listRecentFiles();

      // Should not include deleted file
      expect(result.find((f) => f.path === filePath)).toBeUndefined();
    });
  });
});
