import React, { useState, useEffect, useRef } from 'react';
import { piService } from './services/piService';
import { socketService } from './services/socketService';
import { CanvasBoard } from './components/CanvasBoard';
import { ChatBox } from './components/ChatBox';
import { Lobby } from './components/Lobby';
import type { PiUser, Room } from './types';
import { GamePhase } from './types';

// Mock rooms data
const MOCK_ROOMS: Room[] = [
  { id: '1', name: 'General Art', maxPlayers: 8, currentPlayers: 3 },
  { id: '2', name: 'Pi Network Fans', maxPlayers: 8, currentPlayers: 6 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coins, setCoins] = useState(0); // Mock Economy

  // Game State
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [timer, setTimer] = useState(60);
  const [word, setWord] = useState<string | null>(null); // Only drawer sees this

  // Drawing State
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const clearCanvasRef = useRef<() => void>(() => { });

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await piService.authenticate();
        setUser(userData);
        socketService.connect(userData.accessToken || 'mock');
      } catch (err: any) {
        console.error("Auth Error", err);
        setError(err.message || "Authentication Failed");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === GamePhase.PLAYING && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && phase === GamePhase.PLAYING) {
      // Round End logic
      setPhase(GamePhase.ROUND_END);
    }
    return () => clearInterval(interval);
  }, [phase, timer]);

  const handleCreateRoom = () => {
    // In real app, API call to create room
    const newRoom = { id: '3', name: `${user?.username}'s Room`, maxPlayers: 8, currentPlayers: 1 };
    setCurrentRoom(newRoom);
    startGame(true);
  };

  const handleJoinRoom = (roomId: string) => {
    const room = MOCK_ROOMS.find(r => r.id === roomId);
    if (room) {
      setCurrentRoom(room);
      startGame(false);
    }
  };

  const startGame = (drawer: boolean) => {
    setPhase(GamePhase.PLAYING);
    setIsDrawer(drawer);
    setTimer(60);
    if (drawer) setWord("Apple"); // Mock word
    else setWord(null);
  };

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
    setPhase(GamePhase.LOBBY);
    setCurrentRoom(null);
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
        <h2 className="text-xl text-red-500 font-bold mb-2">Connection Error</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 transition-colors"
        >
          Retry
        </button>
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
        </div>
        <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {phase === GamePhase.LOBBY && (
          <Lobby
            rooms={MOCK_ROOMS}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {phase === GamePhase.PLAYING && currentRoom && (
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
              <p className="text-xl text-gray-300 mb-6">The word was: <span className="text-green-400 font-bold">Apple</span></p>
              <button
                onClick={() => setPhase(GamePhase.LOBBY)}
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