import React from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';
import './QRCodeModal.css';

export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: {
    qrCode: string | null;
    tokenExpiresAt: Date | null;
  };
  onRegenerate: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  authState,
  onRegenerate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="qr-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <QRCodeDisplay authState={authState} onRegenerate={onRegenerate} />
      </div>
    </div>
  );
};
