import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth';
import { useNotifications } from './notifications';

let socket: Socket | null = null;

/** Human-readable messages for each server event. */
const EVENT_TEXT: Record<string, (p: any) => string> = {
  'order.placed': (p) => `New order ${p.reference} placed ($${p.total}).`,
  'order.status_changed': (p) => `Order ${p.reference} is now ${String(p.status).replace('_', ' ')}.`,
  'delivery.assigned': (p) =>
    p.summary ? p.message : `New delivery run assigned (${p.stopCount} stops).`,
  'delivery.stop_updated': (p) =>
    `Delivery for ${p.reference}: ${p.stopStatus}${p.failureReason ? ` — ${p.failureReason}` : ''}.`,
  'complaint.submitted': (p) => `New complaint on ${p.product} (${p.severity ?? 'unclassified'}).`,
  'complaint.escalated': (p) => `⚠ CRITICAL complaint escalated on ${p.product}.`,
  'complaint.resolved': (p) => `Your complaint was ${p.status} (${p.resolution ?? '—'}).`,
  'produce.spoilage_alert': (p) => p.message,
};

const TONE: Record<string, 'info' | 'success' | 'warn' | 'error'> = {
  'complaint.escalated': 'error',
  'produce.spoilage_alert': 'warn',
  'order.placed': 'success',
  'complaint.resolved': 'success',
};

/** A callback registry so pages can refresh their data on relevant events. */
type Listener = (event: string, payload: any) => void;
const listeners = new Set<Listener>();
export const onRealtime = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function connectSocket() {
  const token = useAuth.getState().accessToken;
  if (!token || socket) return;
  socket = io('/ws', { auth: { token }, transports: ['websocket', 'polling'] });

  Object.keys(EVENT_TEXT).forEach((event) => {
    socket!.on(event, (payload: any) => {
      const text = EVENT_TEXT[event](payload);
      useNotifications.getState().push(text, TONE[event] ?? 'info');
      listeners.forEach((l) => l(event, payload));
    });
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
