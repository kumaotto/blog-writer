import { useState } from 'react';
import { useImages } from '../hooks/useImages';
import './ImageGallery.css';

export function ImageGallery() {
  const { images, loading, error, deleteImage, copyURL } = useImages();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const handleDelete = async (key: string) => {
    if (!confirm('この画像を削除しますか？')) {
      return;
    }
    
    setDeletingKey(key);
    try {
      await deleteImage(key);
    } catch (err) {
      // Error is already handled in useImages
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCopyURL = (url: string) => {
    copyURL(url);
    // Show a brief notification (could be enhanced with a toast library)
    alert('URLをクリップボードにコピーしました');
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  const closePreview = () => {
    setSelectedImage(null);
  };

  if (loading && images.length === 0) {
    return (
      <div className="image-gallery">
        <div className="image-gallery-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      <div className="image-gallery-header">
        <h2>画像ギャラリー</h2>
        <span className="image-count">{images.length}枚</span>
      </div>

      {error && (
        <div className="image-gallery-error">
          エラー: {error}
        </div>
      )}

      {images.length === 0 ? (
        <div className="image-gallery-empty">
          アップロードされた画像はありません
        </div>
      ) : (
        <div className="image-gallery-grid">
          {images.map((image) => (
            <div key={image.key} className="image-gallery-item">
              <div 
                className="image-thumbnail"
                onClick={() => handleImageClick(image.url)}
              >
                <img src={image.url} alt={image.key} loading="lazy" />
              </div>
              
              <div className="image-info">
                <div className="image-filename" title={image.key}>
                  {image.key.split('/').pop()}
                </div>
                <div className="image-meta">
                  <span className="image-size">
                    {(image.size / 1024).toFixed(1)} KB
                  </span>
                  <span className="image-date">
                    {new Date(image.uploadedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>

              <div className="image-actions">
                <button
                  className="btn-copy"
                  onClick={() => handleCopyURL(image.url)}
                  title="URLをコピー"
                >
                  📋
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(image.key)}
                  disabled={deletingKey === image.key}
                  title="削除"
                >
                  {deletingKey === image.key ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="image-preview-overlay" onClick={closePreview}>
          <div className="image-preview-container">
            <button className="image-preview-close" onClick={closePreview}>
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="image-preview-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
