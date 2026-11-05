import { io, type Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/realtime';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Where the Socket.IO service runs. Unset means the app uses Supabase Realtime only. */
export const SOCKET_URL: string | undefined = import.meta.env.VITE_SOCKET_URL || undefined;

let socket: RealtimeSocket | null = null;

/** Opens the connection, signing in with the current Supabase token (fetched again on every reconnect). */
export function connectSocket(): RealtimeSocket | null {
  if (!SOCKET_URL) return null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: (done) => {
        supabase.auth.getSession().then(({ data }) => done({ token: data.session?.access_token ?? '' }));
      },
    });
  }
  return socket;
}

/** The open connection, or null when sockets aren't configured or not connected yet. */
export function connectedSocket(): RealtimeSocket | null {
  return socket?.connected ? socket : null;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
