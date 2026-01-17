import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Room, Player, GamePhase, DrawEvent, ChatMessage } from './types';
import { User } from './models/User';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || '')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

const PI_API_KEY = process.env.PI_API_KEY || "mock-key"; 
const PI_API_URL = "https://api.minepi.com/v2";

// --- Payment Routes ---

// Approve Payment
app.post('/payments/approve', async (req, res) => {
    const { paymentId } = req.body;
    console.log(`[Payment] Approving payment: ${paymentId}`);
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

    try {
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/approve`,
            {},
            { headers: { Authorization: `Key ${PI_API_KEY}` } }
        );
        console.log(`[Payment] Approved successfully: ${paymentId}`, response.data);
        res.json(response.data);
    } catch (error: any) {
        console.error("Approval Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Approval failed" });
    }
});

// Complete Payment
app.post('/payments/complete', async (req, res) => {
    const { paymentId, txid } = req.body;
    console.log(`[Payment] Completing payment: ${paymentId}, txid: ${txid}`);
    
    if (!paymentId || !txid) {
        return res.status(400).json({ error: "Missing paymentId or txid" });
    }

    try {
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/complete`,
            { txid },
            { headers: { Authorization: `Key ${PI_API_KEY}` } }
        );
        const payment = response.data;
        console.log(`[Payment] Completed successfully: ${paymentId}`, payment);

        // Update User Coins
        const userUid = payment.user_uid;
        // metadata might be string or object depending on SDK version, usually object in V2
        // Safely parse if needed or access directly. SDK sends object.
        const coinsToAdd = (payment.metadata && payment.metadata.quantity) ? parseInt(payment.metadata.quantity) : 100;
        
        let updatedUser;
        if (userUid) {
            updatedUser = await User.findOneAndUpdate(
                { uid: userUid }, 
                { $inc: { coins: coinsToAdd } },
                { new: true }
            );
            console.log(`[Payment] Credited ${coinsToAdd} coins to ${userUid}`);

            // Notify Socket
            for (const [socketId, player] of players.entries()) {
                if (player.uid === userUid) {
                    io.to(socketId).emit('profile_update', { coins: updatedUser?.coins, xp: updatedUser?.xp });
                    break;
                }
            }
        }

        res.json(payment);
    } catch (error: any) {
        console.error("Completion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Completion failed" });
    }
});

// Ad Reward Endpoint
app.post('/ads/reward', async (req, res) => {
    const { uid } = req.body;
    console.log(`[Ad Reward] Request for user: ${uid}`);

    if (!uid) {
        return res.status(400).json({ error: "Missing uid" });
    }

    try {
        // In a real app, verify the ad view here via server-side callback from Pi
        // For now, we trust the client (MVP/Intranet)
        // Award +5 Coins
        const rewardAmount = 5;
        
        const updatedUser = await User.findOneAndUpdate(
            { uid: uid },
            { $inc: { coins: rewardAmount } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log(`[Ad Reward] Credited ${rewardAmount} coins to ${uid}`);

        // Notify Socket if connected
        // Iterate players to find socket id for this uid
        for (const [socketId, player] of players.entries()) {
            if (player.uid === uid) {
                io.to(socketId).emit('profile_update', { coins: updatedUser.coins });
                break;
            }
        }

        res.json({ success: true, coins: updatedUser.coins });
    } catch (error: any) {
        console.error("Ad Reward Error:", error);
        res.status(500).json({ error: "Reward failed" });
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

import { GameService } from './game/GameService';

// ... (previous imports, keep them?)
// Let's just import GameService and keep others
// I will not replace the top part unless necessary.
// I will start replacement from the socket connection logic or global scope.

const gameService = new GameService(io);

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

// --- Socket Connection ---
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // 1. Identify User
  socket.on('login', async (userData: { username: string; uid: string }) => {
    console.log(`User Logged in: ${userData.username} (${socket.id})`);
    
    let dbUser = await User.findOne({ uid: userData.uid });
    if (!dbUser) {
        dbUser = await User.create({
            uid: userData.uid,
            username: userData.username,
            coins: 100, // Starting bonus
            xp: 0
        });
    } else {
        // Update username if changed
        if (dbUser.username !== userData.username) {
            dbUser.username = userData.username;
            await dbUser.save();
        }
    }

    const newPlayer: Player = {
        id: socket.id,
        uid: userData.uid,
        username: userData.username,
        score: 0,
        isDrawer: false,
        sessionCoins: 0
    };
    players.set(socket.id, newPlayer);
    
    // Send immediate room list & updated profile
    socket.emit('rooms_update', getRoomsList());
    socket.emit('profile_update', { coins: dbUser.coins, xp: dbUser.xp });
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
            timer: 0,
            currentRound: 0,
            totalRounds: 10,
            revealedWord: "",
            correctlyGuessedPlayerIds: []
        }
    };
    
    // Update relationships
    rooms.set(roomId, newRoom);
    player.roomId = roomId;
    socket.join(roomId);
    
    console.log(`Room Created: ${newRoom.name} (${roomId}) by ${player.username}`);

    // Broadcast updates
    broadcastRoomsUpdate();
    gameService.broadcastRoomState(newRoom);
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

      if (room.gameState.phase === GamePhase.PLAYING) {
         const message = gameService.handleMessage(room, player, text);
         if (message) {
             io.to(room.id).emit('chat_message', message);
         }
      } else {
          // Regular Chat in Lobby
           const msg: ChatMessage = {
              id: uuidv4(),
              playerId: player.id,
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
          // Only creator or anyone? Let's say anyone for now is fine, 
          // usually host. Room doesn't have host field in type yet.
          gameService.startGame(room);
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
        gameService.broadcastRoomState(room);
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
            if (room.timerInterval) clearInterval(room.timerInterval);
            rooms.delete(roomId);
            console.log(`Room Deleted (Empty): ${roomId}`);
        } else {
             // Handle if drawer left
             if (room.gameState.currentDrawer === player.id) {
                 // End round or pick new drawer
                 room.gameState.phase = GamePhase.ROUND_END;
                 room.gameState.currentDrawer = undefined;
                 if (room.timerInterval) clearInterval(room.timerInterval);
             }
             gameService.broadcastRoomState(room);
        }
        broadcastRoomsUpdate();
    }
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
