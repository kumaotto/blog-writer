import React from 'react';
import { ErrorType } from '../utils/ErrorHandler';
import './ErrorNotification.css';

export interface ErrorNotificationProps {
  id: string;
  message: string;
  type: ErrorType;
  onDismiss: (id: string) => void;
}

export function ErrorNotification({ id, message, type, onDismiss }: ErrorNotificationProps) {
  const getIcon = () => {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return '🔒';
      case ErrorType.S3:
        return '☁️';
      case ErrorType.FILE_SYSTEM:
        return '📁';
      case ErrorType.WEBSOCKET:
        return '🔌';
      case ErrorType.NETWORK:
        return '🌐';
      case ErrorType.VALIDATION:
        return '⚠️';
      default:
        return '❌';
    }
  };

  const getClassName = () => {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'error-notification error-auth';
      case ErrorType.NETWORK:
      case ErrorType.WEBSOCKET:
        return 'error-notification error-network';
      case ErrorType.VALIDATION:
        return 'error-notification error-validation';
      default:
        return 'error-notification error-default';
    }
  };

  return (
    <div className={getClassName()}>
      <span className="error-icon">{getIcon()}</span>
      <span className="error-message">{message}</span>
      <button
        className="error-dismiss"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
