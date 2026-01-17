import { Server } from 'socket.io';
import { Room, GamePhase, Player, ChatMessage } from '../types';
import { User } from '../models/User'; // Ensure this path is correct relative to this file
import { WORDS } from '../utils/words';
import { v4 as uuidv4 } from 'uuid';

export class GameService {
    constructor(private io: Server) { }

    public getInitialRevealedWord(word: string): string {
        return '_'.repeat(word.length);
    }

    public updateRevealedWord(answer: string, guess: string, currentRevealed: string): string {
        let newRevealed = currentRevealed.split('');
        const answerLower = answer.toLowerCase();
        const guessLower = guess.toLowerCase();

        for (let i = 0; i < answerLower.length; i++) {
            if (i < guessLower.length && guessLower[i] === answerLower[i]) {
                // Reveal the 'display' character from the answer (preserving or normalizing case)
                // Let's just use the lowercase or uppercase from answer? Or just keep it _ if not matched.
                // Usually we want to show the actual letter from the answer.
                // The answer might be "Apple", let's reveal "A" if index 0 matches.
                newRevealed[i] = answer[i]; 
            }
        }
        return newRevealed.join('');
    }

    public async startGame(room: Room) {
        if (room.players.length < 2) return;

        // Reset Game Level State
        room.gameState.totalRounds = 10;
        room.gameState.currentRound = 1;
        room.players.forEach(p => p.score = 0);

        this.startRound(room);
    }

    public startRound(room: Room) {
        room.gameState.phase = GamePhase.PLAYING;
        room.gameState.timer = 60;
        room.gameState.correctlyGuessedPlayerIds = [];

        // Pick Drawer (Round Robin or Random?)
        // Random for now, but ensure everyone gets a turn ideally? 
        // User asked for "10 rounds". Usually implies 10 turns? Or 10 full loops?
        // Let's assume 10 turns total for simplicity unless specified.
        // "one game should be atleast of 10 rounds" -> 10 words drawn.
        
        let candidates = room.players;
        // If there are multiple players, exclude the previous drawer
        if (room.players.length > 1 && room.gameState.currentDrawer) {
            candidates = room.players.filter(p => p.id !== room.gameState.currentDrawer);
        }

        const candidateIndex = Math.floor(Math.random() * candidates.length);
        const drawer = candidates[candidateIndex];
        
        room.players.forEach(p => p.isDrawer = false);
        drawer.isDrawer = true;
        room.gameState.currentDrawer = drawer.id;

        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        room.gameState.currentWord = word;
        room.gameState.revealedWord = this.getInitialRevealedWord(word);

        this.broadcastRoomState(room);

        // Clear existing interval if any
        if (room.timerInterval) clearInterval(room.timerInterval);

        room.timerInterval = setInterval(() => {
            this.gameLoop(room);
        }, 1000);
    }

    private gameLoop(room: Room) {
        if (room.gameState.timer > 0) {
            room.gameState.timer--;
            // Optimization: Maybe don't full broadcast every second
            // But for now it's robust.
            // this.io.to(room.id).emit('timer_update', room.gameState.timer); 
            // If we want to show revealed words updating live, we are broadcasting on guess anyway.
            // Let's just emit timer update to save bandwidth
             this.io.to(room.id).emit('timer_update', room.gameState.timer);
        } else {
            this.endRound(room);
        }
    }

    public endRound(room: Room) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        room.gameState.phase = GamePhase.ROUND_END;
        
        // Reveal word to everyone
        this.io.to(room.id).emit('system_message', `The word was ${room.gameState.currentWord}`);
        this.broadcastRoomState(room);

        setTimeout(() => {
             if (room.gameState.currentRound < room.gameState.totalRounds) {
                 room.gameState.currentRound++;
                 this.startRound(room);
             } else {
                 this.endGame(room);
             }
        }, 5000); // 5 seconds inter-round delay
    }

    public handleMessage(room: Room, player: Player, text: string): ChatMessage | null {
        if (!room.gameState.currentWord) return null;

        const isDrawer = player.id === room.gameState.currentDrawer;
        const targetWord = room.gameState.currentWord;
        const guess = text.trim();
        const now = Date.now();

        // 1. Check if it's the correct guess
        // Ensure player hasn't already guessed correctly
        const alreadyGuessed = room.gameState.correctlyGuessedPlayerIds.includes(player.id);
        
        if (!isDrawer && !alreadyGuessed && guess.toLowerCase() === targetWord.toLowerCase()) {
            // Correct Guess!
            
            // Mark as guessed
            room.gameState.correctlyGuessedPlayerIds.push(player.id);
            
            // Award Coins/Points
            // Guesser: +5 Coins
            player.sessionCoins = (player.sessionCoins || 0) + 5;
            player.score += 100; // Keep score for ranking

            // Artist: +2 Coins
            const drawer = room.players.find(p => p.id === room.gameState.currentDrawer);
            if (drawer) {
                drawer.sessionCoins = (drawer.sessionCoins || 0) + 2;
                drawer.score += 50; 
            }

            // Generate System Message
            const systemMsg: ChatMessage = {
                id: uuidv4(),
                playerId: 'system',
                username: 'System',
                text: `${player.username} guessed the word! (+5 Coins)`,
                type: 'guess',
                timestamp: now
            };
            this.io.to(room.id).emit('chat_message', systemMsg);
            this.broadcastRoomState(room);

            // Check if everyone has guessed
            const guessers = room.players.filter(p => !p.isDrawer);
            if (guessers.every(p => room.gameState.correctlyGuessedPlayerIds.includes(p.id))) {
                // End round early if everyone guessed
                this.endRound(room);
            }

            return null; // Message already handled as system message
        }

        // 2. Incorrect Guess (Potential Hint)
        if (!isDrawer && !alreadyGuessed) {
            // Check for partial matches
            const oldRevealed = room.gameState.revealedWord;
            const newRevealed = this.updateRevealedWord(targetWord, guess, oldRevealed);
            
            if (newRevealed !== oldRevealed) {
                room.gameState.revealedWord = newRevealed;
                this.broadcastRoomState(room);
            }
        }

        // Return as normal chat message
        return {
            id: uuidv4(),
            playerId: player.id,
            username: player.username,
            text: text,
            type: 'chat',
            timestamp: now
        };
    }

    public async endGame(room: Room) {
        room.gameState.phase = GamePhase.GAME_OVER;
        this.broadcastRoomState(room);

        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        const bonuses = [50, 30, 15]; // 1st, 2nd, 3rd

        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            let bonus = 0;
            if (i < bonuses.length) {
                bonus = bonuses[i];
            }

            // Total coins to add to DB
            const totalCoinsToAdd = (player.sessionCoins || 0) + bonus;

            if (totalCoinsToAdd > 0) {
                 try {
                     await User.findOneAndUpdate(
                         { uid: player.uid },
                         { $inc: { coins: totalCoinsToAdd, xp: player.score } }, // Also add score as XP maybe?
                         { new: true }
                     );
                     
                     // Notify player of earnings
                     this.io.to(player.id).emit('game_ended', {
                         rank: i + 1,
                         coinsEarned: player.sessionCoins,
                         bonusCoins: bonus,
                         totalCoins: totalCoinsToAdd
                     });

                     // Update profile
                    //  this.io.to(player.id).emit('profile_update', ...); // Client usually fetches or listens
                 } catch (e) {
                     console.error(`Failed to update coins for ${player.username}:`, e);
                 }
            }
        }
        
        // Reset or Delete room after delay?
        // For now, let them leave manually or restart.
    }
    public broadcastRoomState(room: Room) {
        this.io.to(room.id).emit('room_state', {
            id: room.id,
            players: room.players,
            gameState: room.gameState
        });
    }
}
