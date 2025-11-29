import { useState, useRef, ChangeEvent } from 'react';
import { compressImageIfNeeded } from '../utils/imageCompression';
import './ImageUploader.css';

interface ImageUploaderProps {
  selectedArticleId: string | null;
  onUploadSuccess: () => void;
  onUploadError: (error: string) => void;
}

export function ImageUploader({ selectedArticleId, onUploadSuccess, onUploadError }: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 10MB');
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);
    setCompressionInfo(null);

    // Compress image if needed (>2MB)
    let processedFile = file;
    const originalSize = file.size;
    
    if (file.size > 2 * 1024 * 1024) {
      setIsCompressing(true);
      try {
        processedFile = await compressImageIfNeeded(file, 2, 0.8);
        const compressionRatio = ((1 - processedFile.size / originalSize) * 100).toFixed(0);
        setCompressionInfo(
          `Compressed: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(processedFile.size / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% reduction)`
        );
      } catch (error) {
        console.error('Compression failed:', error);
        setCompressionInfo('Compression failed, using original image');
      } finally {
        setIsCompressing(false);
      }
    }

    setSelectedFile(processedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(processedFile);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedArticleId) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Simulate progress (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${window.location.origin}/api/images/upload-mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: fileBase64,
          mimeType: selectedFile.type,
          articleId: selectedArticleId,
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

      await response.json();
      
      setUploadProgress(100);
      setUploadSuccess(true);
      onUploadSuccess();

      // Reset after success
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setUploadSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      onUploadError(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isDisabled = !selectedArticleId || isUploading;

  return (
    <div className="image-uploader">
      <div className="uploader-header">
        <h2>📷 Upload Image</h2>
      </div>

      <div className="uploader-content">
        {!selectedArticleId && (
          <div className="uploader-disabled-message">
            <p>⚠️ Please select an article first</p>
          </div>
        )}

        {selectedArticleId && !selectedFile && !isCompressing && (
          <div className="file-select-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isDisabled}
              className="file-input"
            />
            <button
              className="select-file-button"
              onClick={handleButtonClick}
              disabled={isDisabled}
            >
              <span className="button-icon">📁</span>
              <span className="button-text">Choose Image</span>
            </button>
            <p className="file-hint">Tap to select an image from your device</p>
            <p className="file-size-hint">Max size: 10MB (images over 2MB will be auto-compressed)</p>
          </div>
        )}

        {isCompressing && (
          <div className="compressing-indicator">
            <div className="spinner"></div>
            <p>Compressing image...</p>
          </div>
        )}

        {selectedFile && previewUrl && (
          <div className="preview-area">
            <div className="preview-image-container">
              <img src={previewUrl} alt="Preview" className="preview-image" />
            </div>
            
            <div className="file-info">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
              {compressionInfo && (
                <div className="compression-info">
                  ✓ {compressionInfo}
                </div>
              )}
            </div>

            {uploadProgress > 0 && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">{uploadProgress}%</div>
              </div>
            )}

            {uploadError && (
              <div className="upload-error">
                <span className="error-icon">❌</span>
                <span className="error-text">{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="upload-success">
                <span className="success-icon">✅</span>
                <span className="success-text">Upload successful!</span>
              </div>
            )}

            <div className="action-buttons">
              <button
                className="upload-button"
                onClick={handleUpload}
                disabled={isUploading || uploadSuccess}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Uploading...</span>
                  </>
                ) : uploadSuccess ? (
                  <>
                    <span>✓</span>
                    <span>Uploaded</span>
                  </>
                ) : (
                  <>
                    <span>⬆️</span>
                    <span>Upload</span>
                  </>
                )}
              </button>
              
              <button
                className="clear-button"
                onClick={handleClear}
                disabled={isUploading}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
