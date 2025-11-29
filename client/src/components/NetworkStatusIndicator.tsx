import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './NetworkStatusIndicator.css';

export function NetworkStatusIndicator() {
  const { isOnline, isReconnecting } = useNetworkStatus();

  // Don't show anything if online and not reconnecting
  if (isOnline && !isReconnecting) {
    return null;
  }

  return (
    <div className={`network-status-indicator ${!isOnline ? 'offline' : 'reconnecting'}`}>
      <div className="network-status-content">
        {!isOnline ? (
          <>
            <span className="status-icon">⚠️</span>
            <span className="status-text">You are offline</span>
          </>
        ) : isReconnecting ? (
          <>
            <span className="status-icon spinner">🔄</span>
            <span className="status-text">Reconnecting...</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
