import type { ChatMessage } from '../types';

// In a real app, this would import 'socket.io-client'
// import io from 'socket.io-client';

type EventCallback<T = unknown> = (data: T) => void;

class SocketService {
  private listeners: Map<string, EventCallback[]> = new Map();
  // private socket: Socket | null = null;

  constructor() {
    // this.socket = io('YOUR_BACKEND_URL');
  }

  // Simulate connecting
  public connect(token: string) {
    console.log("Socket connected with token:", token);
    // Simulate receiving a welcome message
    setTimeout(() => {
      this.trigger('system_message', 'Welcome to the Pi Draw & Guess Server!');
    }, 500);
  }

  // Emit event (Client -> Server)
  public emit<T = unknown>(event: string, data: T) {
    console.log(`[Socket Emit] ${event}:`, data);
    
    // FOR DEMO PURPOSES: Echo relevant events back to simulate multiplayer
    if (event === 'draw_stroke') {
        // In real app, server broadcasts this to OTHERS, not sender.
        // Here we do nothing because we draw locally immediately.
    }
    if (event === 'send_chat') {
        const payload = data as { playerId: string; username: string; text: string };
        const chatMsg: ChatMessage = {
            id: Date.now().toString(),
            playerId: payload.playerId,
            username: payload.username,
            text: payload.text,
            type: 'chat',
            timestamp: Date.now()
        };
        // Simulate broadcast
        setTimeout(() => this.trigger('chat_message', chatMsg), 100);
        
        // Simulate a correct guess logic from server
        if (payload.text.toLowerCase().includes('apple')) {
             setTimeout(() => {
                this.trigger('chat_message', {
                    id: Date.now().toString(),
                    playerId: 'system',
                    username: 'System',
                    text: `${payload.username} guessed the word!`,
                    type: 'guess',
                    timestamp: Date.now()
                });
             }, 500);
        }
    }
  }

  // Subscribe to event (Server -> Client)
  public on<T = unknown>(event: string, callback: EventCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback as EventCallback);
  }

  // Unsubscribe
  public off<T = unknown>(event: string, callback: EventCallback<T>) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback as unknown));
    }
  }

  // Internal helper to trigger listeners (Mocking server response)
  private trigger<T = unknown>(event: string, data: T) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const socketService = new SocketService();