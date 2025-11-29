/**
 * Compress image if it exceeds the size threshold
 * @param file - The image file to compress
 * @param maxSizeMB - Maximum size in MB (default: 2MB)
 * @param quality - Compression quality 0-1 (default: 0.8)
 * @returns Compressed file or original if under threshold
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeMB: number = 2,
  quality: number = 0.8
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If file is under threshold, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions to reduce file size
        // Start with original dimensions and scale down if needed
        const maxDimension = 2048; // Max width or height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            console.log(
              `Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(
                compressedFile.size /
                1024 /
                1024
              ).toFixed(2)}MB`
            );

            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
