import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Room, Player, GamePhase, DrawEvent, ChatMessage } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const PI_API_KEY = "ggsgj47jhzjrrdpweal667p9fnpmelugfqlqsjpzmyroc1zwieufoi4nyz5w5r17"; // TODO: Get from Pi Developer Portal
const PI_API_URL = "https://api.minepi.com/v2";

// --- Payment Routes ---

// Approve Payment
app.post('/payments/approve', async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

    try {
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/approve`,
            {},
            { headers: { Authorization: `Key ${PI_API_KEY}` } }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error("Approval Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Approval failed" });
    }
});

// Complete Payment
app.post('/payments/complete', async (req, res) => {
    const { paymentId, txid } = req.body;
    
    if (!paymentId || !txid) {
        return res.status(400).json({ error: "Missing paymentId or txid" });
    }

    try {
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/complete`,
            { txid },
            { headers: { Authorization: `Key ${PI_API_KEY}` } }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error("Completion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Completion failed" });
    }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for now, lock down in production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- In-Memory State ---
const rooms: Map<string, Room> = new Map();
// Map socket.id -> Player
const players: Map<string, Player> = new Map();

// --- Helper Functions ---
function getRoomsList() {
    return Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        maxPlayers: r.maxPlayers,
        currentPlayers: r.players.length // For client display
    }));
}

function broadcastRoomsUpdate() {
    io.emit('rooms_update', getRoomsList());
}

function broadcastRoomState(roomId: string) {
    const room = rooms.get(roomId);
    if (room) {
        // Send sanitize room state (mask word if not drawer) - simpler for now to send full
        // TODO: Mask word for guessers
        io.to(roomId).emit('room_state', {
            id: room.id,
            players: room.players,
            gameState: room.gameState
        });
    }
}

// --- Socket Connection ---
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // 1. Identify User
  socket.on('login', (userData: { username: string; uid: string }) => {
    console.log(`User Logged in: ${userData.username} (${socket.id})`);
    
    const newPlayer: Player = {
        id: socket.id,
        username: userData.username,
        score: 0,
        isDrawer: false
    };
    players.set(socket.id, newPlayer);
    
    // Send immediate room list
    socket.emit('rooms_update', getRoomsList());
  });

  // 2. Create Room
  socket.on('create_room', (roomName: string) => {
    const player = players.get(socket.id);
    if (!player) return;

    // Leave existing room if any
    if (player.roomId) {
        leaveRoom(socket);
    }

    const roomId = uuidv4();
    const newRoom: Room = {
        id: roomId,
        name: roomName || `Room ${roomId.substr(0,4)}`,
        maxPlayers: 8,
        players: [player], // Add creator immediately
        gameState: {
            phase: GamePhase.LOBBY,
            timer: 0
        }
    };
    
    // Update relationships
    rooms.set(roomId, newRoom);
    player.roomId = roomId;
    socket.join(roomId);
    
    console.log(`Room Created: ${newRoom.name} (${roomId}) by ${player.username}`);

    // Broadcast updates
    broadcastRoomsUpdate();
    broadcastRoomState(roomId);
  });

  // 3. Join Room
  socket.on('join_room', (roomId: string) => {
      joinRoom(socket, roomId);
  });

  // 4. Leave Room
  socket.on('leave_room', () => {
      leaveRoom(socket);
  });

  // 5. Draw Event
  socket.on('draw_stroke', (data: DrawEvent) => {
      const player = players.get(socket.id);
      if (player && player.roomId && player.isDrawer) {
          socket.to(player.roomId).emit('draw_stroke', data);
      }
  });

  socket.on('clear_canvas', () => {
    const player = players.get(socket.id);
    if (player && player.roomId && player.isDrawer) {
        socket.to(player.roomId).emit('clear_canvas');
    }
  });

  // 6. Chat / Guess
  socket.on('send_message', (text: string) => {
      const player = players.get(socket.id);
      if (!player || !player.roomId) return;

      const room = rooms.get(player.roomId);
      if (!room) return;

      const isCorrectGuess = 
        room.gameState.phase === GamePhase.PLAYING && 
        room.gameState.currentWord && 
        text.toLowerCase().trim() === room.gameState.currentWord.toLowerCase().trim() &&
        !player.isDrawer;

      if (isCorrectGuess) {
          // Handle Correct Guess
           const systemMsg: ChatMessage = {
              id: uuidv4(),
              playerId: 'system',
              username: 'System',
              text: `${player.username} guessed the Word!`,
              type: 'guess',
              timestamp: Date.now()
          };
          io.to(room.id).emit('chat_message', systemMsg);
          
          // Award points
          player.score += 10;
          // Drawer gets points too
          const drawer = room.players.find(p => p.id === room.gameState.currentDrawer);
          if (drawer) drawer.score += 5;

          broadcastRoomState(room.id);
          
          // TODO: Trigger round end or next turn
      } else {
          // Regular Chat
          const msg: ChatMessage = {
              id: uuidv4(),
              playerId: player.id, // Use socket ID as consistent player ID for now
              username: player.username,
              text: text,
              type: 'chat',
              timestamp: Date.now()
          };
          io.to(room.id).emit('chat_message', msg);
      }
  });

  // 7. Start Game
  socket.on('start_game', () => {
      const player = players.get(socket.id);
      if (!player || !player.roomId) return;
      
      const room = rooms.get(player.roomId);
      if (room) {
          startGame(room);
      }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    leaveRoom(socket);
    players.delete(socket.id);
  });
});

function joinRoom(socket: Socket, roomId: string) {
    const player = players.get(socket.id);
    const room = rooms.get(roomId);

    if (player && room) {
        // Leave current room first if any
        if (player.roomId) leaveRoom(socket);

        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', 'Room is full');
            return;
        }

        player.roomId = roomId;
        room.players.push(player);
        socket.join(roomId);

        // Notify room
        broadcastRoomState(roomId);
        broadcastRoomsUpdate(); // Update player counts for lobby
    }
}

function leaveRoom(socket: Socket) {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    const roomId = player.roomId;
    const room = rooms.get(roomId);

    if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        player.roomId = undefined;
        player.isDrawer = false;

        if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`Room Deleted (Empty): ${roomId}`);
        } else {
             // Handle if drawer left
             if (room.gameState.currentDrawer === player.id) {
                 // End round or pick new drawer
                 room.gameState.phase = GamePhase.ROUND_END;
                 room.gameState.currentDrawer = undefined;
             }
             broadcastRoomState(roomId);
        }
        broadcastRoomsUpdate();
    }
}

function startGame(room: Room) {
    if (room.players.length < 2) return; // Need at least 2 players

    room.gameState.phase = GamePhase.PLAYING;
    room.gameState.timer = 60;
    
    // Pick random drawer
    const drawerIndex = Math.floor(Math.random() * room.players.length);
    const drawer = room.players[drawerIndex];
    
    // Reset all drawers
    room.players.forEach(p => p.isDrawer = false);
    drawer.isDrawer = true;
    room.gameState.currentDrawer = drawer.id;

    // Pick random word
    const words = ["Apple", "Banana", "Car", "House", "Sun", "Tree", "Cat", "Dog", "Mouse", "Mouse"];
    room.gameState.currentWord = words[Math.floor(Math.random() * words.length)];

    broadcastRoomState(room.id);

    // Start Timer Interval (In memory for simple implementation)
    // Note: In real app, manage this better to avoid leaks
    const interval = setInterval(() => {
        if (!rooms.has(room.id)) {
            clearInterval(interval);
            return;
        }
        
        room.gameState.timer--;
        
        if (room.gameState.timer <= 0) {
            clearInterval(interval);
            room.gameState.phase = GamePhase.ROUND_END;
            broadcastRoomState(room.id);
        } else {
             // Optimize: Don't broadcast every second if not needed, but for sync it's okay
             // Or just emit 'timer_tick'
             io.to(room.id).emit('timer_update', room.gameState.timer);
        }
    }, 1000);
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
