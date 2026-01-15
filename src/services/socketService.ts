import { io, Socket } from 'socket.io-client';
import type { ChatMessage, DrawEvent, Room, Player } from '../types';

// TODO: Use env variable for URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type EventCallback<T = any> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();

  public get socketId(): string | undefined {
    return this.socket?.id;
  }

  public connect(token: string, username: string, uid: string) {
    if (this.socket?.connected) return;

    this.socket = io(SERVER_URL, {
        autoConnect: false,
    });

    this.socket.connect();

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      // Login immediately upon connection
      this.emit('login', { username, uid });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Re-attach custom listeners if any were added before connection
    this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(cb => {
            this.socket?.on(event, cb);
        });
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public emit<T = any>(event: string, data: T) {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
        console.warn('Socket not connected, cannot emit', event);
    }
  }

  public on<T = any>(event: string, callback: EventCallback<T>) {
    // Store internally to rebind on reconnects
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off<T = any>(event: string, callback: EventCallback<T>) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
    
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();