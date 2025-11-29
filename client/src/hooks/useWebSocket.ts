import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketStatus } from '../types';
import { ErrorHandler, AppError, ErrorType } from '../utils/ErrorHandler';

interface UseWebSocketOptions {
  url: string;
  sessionToken?: string | null;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface WebSocketEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onImageInsert?: (data: { articleId: string; imageUrl: string }) => void;
  onArticleList?: (data: { articles: Array<{ id: string; title: string }> }) => void;
  onArticleUpdate?: (data: { articleId: string; title: string }) => void;
}

export function useWebSocket(options: UseWebSocketOptions, events: WebSocketEvents = {}) {
  const {
    url,
    sessionToken,
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setStatus('connecting');

    const socket = io(url, {
      auth: {
        token: sessionToken || undefined, // PC editor can connect without token
      },
      transports: ['websocket'],
      reconnection: false, // Manual reconnection with exponential backoff
    });

    socket.on('connect', () => {
      setStatus('connected');
      reconnectCountRef.current = 0;
      events.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setStatus('disconnected');
      events.onDisconnect?.();
      
      // Attempt reconnection with exponential backoff
      if (reconnectCountRef.current < reconnectionAttempts) {
        const delay = reconnectionDelay * Math.pow(2, reconnectCountRef.current);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${reconnectionAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectCountRef.current++;
          connect();
        }, delay);
      } else {
        // Max reconnection attempts reached
        const error = new AppError(
          'WebSocket connection lost',
          ErrorType.WEBSOCKET,
          false,
          'Connection to server lost. Please refresh the page.'
        );
        ErrorHandler.handle(error, 'WebSocket');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setStatus('error');
      events.onError?.(error);
      
      // Handle connection errors
      const appError = new AppError(
        error.message,
        ErrorType.WEBSOCKET,
        true,
        'Failed to connect to server. Retrying...'
      );
      ErrorHandler.handle(appError, 'WebSocket');
    });

    // Custom events
    socket.on('image-insert', (data: { articleId: string; imageUrl: string }) => {
      events.onImageInsert?.(data);
    });

    socket.on('article-list', (data: { articles: Array<{ id: string; title: string }> }) => {
      events.onArticleList?.(data);
    });

    socket.on('article-update', (data: { articleId: string; title: string }) => {
      events.onArticleUpdate?.(data);
    });

    socketRef.current = socket;
  }, [url, sessionToken, reconnectionAttempts, reconnectionDelay, events]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setStatus('disconnected');
    reconnectCountRef.current = 0;
  }, []);

  // Send article list to mobile
  const sendArticleList = useCallback((articles: Array<{ id: string; title: string }>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('article-list', articles);
    }
  }, []);

  // Send article update notification
  const sendArticleUpdate = useCallback((articleId: string, title: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('article-update', { articleId, title });
    }
  }, []);

  // Send heartbeat (ping)
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Heartbeat interval (30 seconds)
  useEffect(() => {
    if (status === 'connected') {
      const interval = setInterval(() => {
        sendHeartbeat();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [status, sendHeartbeat]);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    sendArticleList,
    sendArticleUpdate,
  };
}
