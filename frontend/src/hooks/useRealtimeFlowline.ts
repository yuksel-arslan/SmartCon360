// Hook: real-time flowline updates via Socket.io
// Connects to platform-service notification channel and refreshes data on plan/progress changes.

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFlowlineStore } from '@/stores/flowlineStore';

// WebSocket URL must be explicitly configured; skip connection otherwise.
// Without a deployed notification-service, Socket.io would spam failed connections.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';

export type FlowlineEvent =
  | 'plan:updated'
  | 'plan:created'
  | 'progress:updated'
  | 'constraint:resolved'
  | 'assignment:changed';

interface UseRealtimeFlowlineOptions {
  projectId: string | null;
  onEvent?: (event: FlowlineEvent, data: unknown) => void;
}

export function useRealtimeFlowline({ projectId, onEvent }: UseRealtimeFlowlineOptions) {
  const socketRef = useRef<Socket | null>(null);
  const setConnected = useFlowlineStore((s) => s.setConnected);
  const isConnected = useFlowlineStore((s) => s.isConnected);

  const connect = useCallback(() => {
    if (!projectId || socketRef.current?.connected) return;

    // Skip WebSocket connection when no server is configured or available
    if (!WS_URL) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const socket = io(WS_URL, {
      path: '/api/v1/ws',
      auth: { token },
      query: { projectId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 3,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:project', projectId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      // Silently handle connection errors — WS server may not be deployed yet
    });

    // Listen for plan/progress events from the server
    const events: FlowlineEvent[] = [
      'plan:updated',
      'plan:created',
      'progress:updated',
      'constraint:resolved',
      'assignment:changed',
    ];

    events.forEach((evt) => {
      socket.on(evt, (data: unknown) => {
        onEvent?.(evt, data);
      });
    });

    socketRef.current = socket;
  }, [projectId, setConnected, onEvent]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, [setConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  /** Emit an event to broadcast changes to other clients */
  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { isConnected, emit, disconnect };
}
