import { useState, useEffect, useCallback } from 'react';
import { ImageMetadata } from '../types';

export function useImages() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      const data = await response.json();
      setImages(data.images.map((img: any) => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt)
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteImage = useCallback(async (key: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/images/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      // Remove from local state
      setImages(prev => prev.filter(img => img.key !== key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting image:', err);
      throw err;
    }
  }, []);

  const copyURL = useCallback((url: string) => {
    navigator.clipboard.writeText(url).catch(err => {
      console.error('Failed to copy URL:', err);
      setError('Failed to copy URL to clipboard');
    });
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    error,
    fetchImages,
    deleteImage,
    copyURL,
  };
}
