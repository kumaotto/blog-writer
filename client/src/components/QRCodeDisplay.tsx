import React, { useEffect, useState } from 'react';
import './QRCodeDisplay.css';

export interface QRCodeDisplayProps {
  qrCodeDataURL: string | null;
  onRegenerate: () => Promise<void>;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeDataURL,
  onRegenerate,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds
  const [error, setError] = useState<string | null>(null);

  // Reset timer when QR code changes
  useEffect(() => {
    setTimeRemaining(300); // Reset to 5 minutes
  }, [qrCodeDataURL]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeRemaining, qrCodeDataURL]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    
    try {
      await onRegenerate();
      setTimeRemaining(300); // Reset timer
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeRemaining === 0;

  return (
    <div className="qr-code-display">
      <div className="qr-code-header">
        <h3>スマホでスキャン</h3>
        <p className="qr-code-description">
          スマホのカメラでQRコードをスキャンして画像をアップロード
        </p>
      </div>

      <div className={`qr-code-container ${isExpired ? 'expired' : ''}`}>
        {qrCodeDataURL ? (
          <>
            <img 
              src={qrCodeDataURL} 
              alt="QR Code for mobile access" 
              className="qr-code-image"
            />
            {isExpired && (
              <div className="qr-code-overlay">
                <span className="expired-label">期限切れ</span>
              </div>
            )}
          </>
        ) : (
          <div className="qr-code-placeholder">
            <span>QRコードを生成中...</span>
          </div>
        )}
      </div>

      <div className="qr-code-footer">
        <div className={`token-expiry ${isExpired ? 'expired' : ''}`}>
          <span className="expiry-label">有効期限:</span>
          <span className="expiry-time">{formatTime(timeRemaining)}</span>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="btn-regenerate"
        >
          {isRegenerating ? '生成中...' : 'QRコード再生成'}
        </button>

        {error && (
          <div className="qr-code-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
