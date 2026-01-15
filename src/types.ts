// --- Pi Network Types ---
export interface PiUser {
  uid: string;
  username: string;
  accessToken?: string;
}

export interface PiPaymentDTO {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

// --- Game Domain Types ---
export const GamePhase = {
  LOBBY: 'LOBBY',
  PLAYING: 'PLAYING',
  ROUND_END: 'ROUND_END',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export interface Player {
  id: string;
  username: string;
  score: number;
  avatarUrl?: string;
  isDrawer: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  text: string;
  type: 'chat' | 'system' | 'guess';
  timestamp: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawEvent {
  start: Point;
  end: Point;
  color: string;
  width: number;
  isEnd: boolean; // true if this is the end of a stroke
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
}