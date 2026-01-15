import React, { useState, useEffect, useRef } from 'react';
import { piService } from './services/piService';
import { socketService } from './services/socketService';
import { CanvasBoard } from './components/CanvasBoard';
import { ChatBox } from './components/ChatBox';
import { Lobby } from './components/Lobby';
import type { PiUser, Room } from './types';
import { GamePhase } from './types';

// Mock rooms data
const App: React.FC = () => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coins, setCoins] = useState(0); // Mock Economy

  const [rooms, setRooms] = useState<Room[]>([]);

  // Game State
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [timer, setTimer] = useState(60);
  const [word, setWord] = useState<string | null>(null); // Only drawer sees this

  // Debug State
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Drawing State
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  const clearCanvasRef = useRef<() => void>(() => { });

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  useEffect(() => {
    // Subscribe to Pi Service Logs
    piService.onLog((msg) => {
      setLogs(prev => [...prev, msg]);
    });

    const init = async () => {
      try {
        const userData = await piService.authenticate();
        setUser(userData);
        socketService.connect(userData.accessToken || 'mock', userData.username, userData.uid);
      } catch (err: any) {
        console.error("Auth Error", err);
        setError(err.message || "Authentication Failed");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!user) return;

    socketService.on('rooms_update', (roomsData: Room[]) => {
      setRooms(roomsData);
    });

    socketService.on('room_state', (data: any) => {
      // data: { id, players, gameState }
      const { id, players, gameState } = data;

      // Check if we are in this room or joining it
      setCurrentRoom((prev) => ({
        ...prev,
        id: id,
        name: id, // TODO: server should send name
        maxPlayers: 8,
        currentPlayers: players.length,
        // We can store players list if needed
      }));

      setPhase(gameState.phase);

      if (gameState.currentDrawer) {
        setIsDrawer(gameState.currentDrawer === socketService.socketId);
      }

      if (gameState.currentWord) {
        setWord(gameState.currentWord);
      } else {
        setWord(null);
      }

      if (gameState.timer !== undefined) {
        setTimer(gameState.timer);
      }
    });

    socketService.on('timer_update', (t: number) => {
      setTimer(t);
    });

    // Cleanup listeners
    return () => {
      socketService.off('rooms_update', () => { });
      socketService.off('room_state', () => { });
      socketService.off('timer_update', () => { });
    };
  }, [user]);

  const handleCreateRoom = () => {
    socketService.emit('create_room', `${user?.username}'s Room`);
  };

  const handleJoinRoom = (roomId: string) => {
    socketService.emit('join_room', roomId);
  };

  const handleStartGame = () => {
    socketService.emit('start_game', {});
  }

  const handleBuyCoins = async () => {
    try {
      await piService.createPayment({
        amount: 1,
        memo: "100 Game Coins",
        metadata: { type: 'coins', quantity: 100 }
      });
      setCoins(prev => prev + 100);
    } catch (e) {
      console.error("Payment failed", e);
    }
  };

  const handleLeaveRoom = () => {
    socketService.emit('leave_room', {});
    setPhase(GamePhase.LOBBY);
    setCurrentRoom(null);
  };

  const handleMockMode = () => {
    // Create a mock user for testing/desktop
    const mockUser: PiUser = {
      uid: 'mock-user-' + Math.floor(Math.random() * 1000),
      username: 'Guest_User',
      accessToken: 'mock-token-123'
    };
    setUser(mockUser);
    setCoins(1000); // Give some mock coins
    setError(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-purple-400 text-xl font-bold">
        <div className="animate-pulse">Connecting to Pi Network...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center max-w-md mx-auto">
        <h2 className="text-xl text-red-500 font-bold mb-4">Connection Failed</h2>
        <p className="mb-6 text-gray-300">
          {error.includes("timed out")
            ? "Could not connect to Pi Browser. Are you running this in a standard browser (Chrome/Edge)? This app requires the official Pi Browser app to log in."
            : error}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors border border-gray-600"
          >
            Retry
          </button>
          <button
            onClick={handleMockMode}
            className="px-6 py-2 bg-purple-600 rounded hover:bg-purple-500 transition-colors font-bold"
          >
            Play in Mock Mode (Desktop)
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-10 text-center text-white">Authentication Failed. Please open in Pi Browser.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-yellow-400">
            PiDraw
          </span>
          <span className="text-xs text-gray-500 border border-gray-600 rounded px-1">v1.0.3</span>
          {user.username === 'Guest_User' && (
            <span className="text-xs bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded px-2 py-0.5">Mock Mode</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-gray-400 border border-gray-600 px-2 py-1 rounded hover:bg-gray-700"
          >
            {showLogs ? 'Hide Logs' : 'Debug Logs'}
          </button>
          <div className="flex items-center bg-gray-700 rounded-full px-3 py-1">
            <span className="text-yellow-400 font-bold mr-1">¢</span>
            <span className="text-sm font-mono">{coins}</span>
            <button
              onClick={handleBuyCoins}
              className="ml-2 text-xs bg-yellow-600 hover:bg-yellow-500 px-2 py-0.5 rounded text-white font-bold transition-colors"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <span className="hidden sm:inline text-sm font-medium">{user.username}</span>
          </div>
        </div>
      </header>

      {/* Debug Logs Overlay */}
      {showLogs && (
        <div className="fixed top-14 left-0 right-0 h-48 bg-black/90 z-[100] overflow-y-auto border-b border-gray-600 p-2 font-mono text-xs text-green-400">
          {logs.length === 0 && <span className="text-gray-500">Waiting for logs...</span>}
          {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-0.5 break-all">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {!currentRoom && (
          <Lobby
            rooms={rooms}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {currentRoom && phase === GamePhase.LOBBY && (
          <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white">
            <div className="bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700 text-center">
              <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Waiting for Players...</h2>
              <p className="mb-6 text-xl text-gray-300">Room: <span className="font-bold text-white">{currentRoom.name}</span></p>

              <div className="mb-8 p-4 bg-gray-700 rounded-lg">
                <p className="text-2xl font-mono">{currentRoom.currentPlayers} / {currentRoom.maxPlayers}</p>
                <p className="text-sm text-gray-400">Players Joined</p>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleStartGame}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-xl font-bold hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentRoom.currentPlayers < 2}
                >
                  Start Game
                </button>
                <button onClick={handleLeaveRoom} className="text-gray-400 hover:text-white underline transition-colors">
                  Leave Room
                </button>
              </div>
              {currentRoom.currentPlayers < 2 && (
                <p className="mt-4 text-yellow-500 text-sm">Need at least 2 players to start.</p>
              )}
            </div>
          </div>
        )}

        {currentRoom && phase === GamePhase.PLAYING && (
          <div className="flex h-full flex-col md:flex-row">
            {/* Left Sidebar: Player List & Tools (Mobile: Top) */}
            <div className="bg-gray-800 md:w-48 p-2 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 border-r border-gray-700">
              <div className="md:mb-4 w-full flex md:block justify-between items-center">
                <div className="text-xs text-gray-400 uppercase font-bold mb-1">Time</div>
                <div className={`text-2xl font-mono font-bold ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {timer}s
                </div>
              </div>

              {isDrawer && (
                <div className="flex gap-2 md:flex-col">
                  <div className="text-xs text-gray-400 uppercase font-bold hidden md:block">Tools</div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <div className="flex gap-1 bg-gray-700 rounded p-1">
                    {[2, 5, 10].map(size => (
                      <button
                        key={size}
                        onClick={() => setLineWidth(size)}
                        className={`w-6 h-6 rounded-full bg-gray-500 ${lineWidth === size ? 'ring-2 ring-white bg-gray-400' : ''}`}
                        style={{ transform: `scale(${size / 10 + 0.5})` }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => clearCanvasRef.current()}
                    className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded hover:bg-red-800"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Word Display (Drawer Only) */}
              {isDrawer && word && (
                <div className="bg-purple-900/50 p-2 rounded border border-purple-500 mt-2">
                  <div className="text-xs text-purple-300 uppercase">Draw:</div>
                  <div className="font-bold text-lg">{word}</div>
                </div>
              )}
              {!isDrawer && (
                <div className="bg-gray-700/50 p-2 rounded border border-gray-600 mt-2">
                  <div className="text-xs text-gray-400 uppercase">Hint:</div>
                  <div className="font-bold tracking-widest">_ _ _ _ _</div>
                </div>
              )}

              <button onClick={handleLeaveRoom} className="mt-auto text-xs text-red-400 hover:text-red-300 underline">
                Leave
              </button>
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 bg-gray-200 relative p-4 flex items-center justify-center overflow-hidden">
              <div className="aspect-square w-full max-w-[600px] max-h-[90vh] shadow-2xl">
                <CanvasBoard
                  isDrawer={isDrawer}
                  currentColor={color}
                  lineWidth={lineWidth}
                  onClearRef={clearCanvasRef}
                />
              </div>
            </div>

            {/* Right: Chat (Mobile: Bottom overlay or separate) */}
            <div className="w-full md:w-72 h-48 md:h-auto shrink-0 border-l border-gray-700">
              <ChatBox playerId={user.uid} username={user.username} />
            </div>
          </div>
        )}

        {phase === GamePhase.ROUND_END && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl text-center border border-purple-500 shadow-2xl">
              <h2 className="text-3xl font-bold mb-4 text-white">Round Over!</h2>
              {/* <p className="text-xl text-gray-300 mb-6">The word was: <span className="text-green-400 font-bold">Apple</span></p> */}
              {/* TODO: Display word from server */}
              <button
                onClick={() => {
                  handleLeaveRoom(); // Simple reset for now
                }}
                className="px-6 py-2 bg-purple-600 rounded text-white font-bold hover:bg-purple-500"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;