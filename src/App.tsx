import React, { useEffect, useRef, useState } from 'react';
import { CanvasBoard } from './components/CanvasBoard';
import { ChatBox } from './components/ChatBox';
import { Lobby } from './components/Lobby';
import { piService } from './services/piService';
import { socketService } from './services/socketService';
import type { PiUser, Room } from './types';
import { GamePhase } from './types';

import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

// Mock rooms data
const App: React.FC = () => {
  const [view, setView] = useState<'game' | 'privacy' | 'terms'>('game');
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
  const [revealedWord, setRevealedWord] = useState<string>("");
  const [roundInfo, setRoundInfo] = useState({ current: 0, total: 10 });
  const [rankings, setRankings] = useState<any[]>([]); // For Game Over
  const [roundWinners, setRoundWinners] = useState<string[]>([]);

  // Debug State
  // const [showLogs, setShowLogs] = useState(false);
  // const [logs, setLogs] = useState<string[]>([]);
  // const logsEndRef = useRef<HTMLDivElement>(null);

  // Drawing State
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  const clearCanvasRef = useRef<() => void>(() => { });

  // Auto-scroll logs
  // useEffect(() => {
  //   if (showLogs && logsEndRef.current) {
  //     logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [logs, showLogs]);

  useEffect(() => {
    // Subscribe to Pi Service Logs
    // piService.onLog((msg) => {
    //   setLogs(prev => [...prev, msg]);
    // });

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
      setRankings(players.sort((a: any, b: any) => b.score - a.score));

      if (gameState.currentDrawer) {
        setIsDrawer(gameState.currentDrawer === socketService.socketId);
      }

      if (gameState.currentWord) {
        setWord(gameState.currentWord);
      } else {
        setWord(null);
      }

      if (gameState.revealedWord) {
        setRevealedWord(gameState.revealedWord);
      }

      if (gameState.currentRound) {
        setRoundInfo({
          current: gameState.currentRound,
          total: gameState.totalRounds || 10
        });
      }

      if (gameState.timer !== undefined) {
        setTimer(gameState.timer);
      }

      if (gameState.correctlyGuessedPlayerIds && players) {
        const winners = players
          .filter((p: any) => gameState.correctlyGuessedPlayerIds.includes(p.id))
          .map((p: any) => p.username);
        setRoundWinners(winners);
      } else {
        setRoundWinners([]);
      }
    });

    socketService.on('timer_update', (t: number) => {
      setTimer(t);
    });

    socketService.on('profile_update', (data: { coins: number, xp?: number }) => {
      if (data.coins !== undefined) setCoins(data.coins);
    });

    socketService.on('hint_error', (message: string) => {
      alert(message);
    });

    // Cleanup listeners
    return () => {
      socketService.off('rooms_update', () => { });
      socketService.off('room_state', () => { });
      socketService.off('timer_update', () => { });
      socketService.off('profile_update', () => { });
      socketService.off('hint_error', () => { });
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
      // Coins update via socket event 'profile_update'
    } catch (e) {
      console.error("Payment failed", e);
    }
  };

  const handleWatchAd = async () => {
    try {
      const adId = await piService.showAd("rewarded");

      // Request reward from backend with adId for verification
      await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/ads/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user?.uid, adId: adId })
      });

      // Refresh profile or wait for socket update
    } catch (e: any) {
      console.error("Ad failed", e);
      alert(`Ad failed: ${e.message || "Unknown error"}`);
    }
  };

  const handleLeaveRoom = () => {
    socketService.emit('leave_room', {});
    setPhase(GamePhase.LOBBY);
    setCurrentRoom(null);
  };

  const handleBuyHint = () => {
    socketService.emit('buy_hint', {});
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

  if (view === 'privacy') {
    return <PrivacyPolicy onBack={() => setView('game')} />;
  }

  if (view === 'terms') {
    return <TermsOfService onBack={() => setView('game')} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-yellow-400">
            DrawPi
          </span>
          <span className="text-xs text-gray-500 border border-gray-600 rounded px-1">v1.0.3</span>
          {user.username === 'Guest_User' && (
            <span className="text-xs bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded px-2 py-0.5">Mock Mode</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-gray-400 border border-gray-600 px-2 py-1 rounded hover:bg-gray-700"
          >
            {showLogs ? 'Hide Logs' : 'Debug Logs'}
          </button> */}
          <div className="flex items-center bg-gray-700 rounded-full px-3 py-1">
            <span className="text-yellow-400 font-bold mr-1">¢</span>
            <span className="text-sm font-mono">{coins}</span>
            <button
              onClick={handleBuyCoins}
              className="ml-2 text-xs bg-yellow-600 hover:bg-yellow-500 px-2 py-0.5 rounded text-white font-bold transition-colors"
            >
              +
            </button>
            <button
              onClick={handleWatchAd}
              className="ml-2 text-xs bg-purple-600 hover:bg-purple-500 px-2 py-0.5 rounded text-white font-bold transition-colors border border-purple-400"
              title="Watch Ad (+5 Coins)"
            >
              Ad
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
      {/* {showLogs && (
        <div className="fixed top-14 left-0 right-0 h-48 bg-black/90 z-[100] overflow-y-auto border-b border-gray-600 p-2 font-mono text-xs text-green-400">
          {logs.length === 0 && <span className="text-gray-500">Waiting for logs...</span>}
          {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-0.5 break-all">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )} */}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {!currentRoom && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <Lobby
                rooms={rooms}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
              />
            </div>
            <footer className="p-4 text-center text-xs text-gray-500 space-x-4 border-t border-gray-800 bg-gray-900">
              <button onClick={() => setView('privacy')} className="hover:text-purple-400 underline transition-colors">Privacy Policy</button>
              <span>•</span>
              <button onClick={() => setView('terms')} className="hover:text-purple-400 underline transition-colors">Terms of Service</button>
            </footer>
          </div>
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
          <div className="flex h-full flex-col">
            {/* Top Game Info Bar */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
              {/* Left: Round Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                  <span className="text-xs text-gray-400 uppercase">Round</span>
                  <span className="font-mono font-bold text-purple-400">
                    {roundInfo.current}/{roundInfo.total}
                  </span>
                </div>
                <button
                  onClick={handleLeaveRoom}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-400/30 rounded hover:bg-red-400/10"
                >
                  Leave
                </button>
              </div>

              {/* Center: Word Display */}
              <div className="flex-1 flex justify-center">
                {isDrawer && word && (
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 rounded-full shadow-lg">
                    <span className="text-xs text-purple-200 uppercase mr-2">Draw:</span>
                    <span className="font-bold text-lg text-white">{word}</span>
                  </div>
                )}
                {!isDrawer && (
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-700 px-6 py-2 rounded-full border border-gray-600">
                      <span className="font-bold tracking-[0.3em] text-xl font-mono text-white">
                        {revealedWord || "_ _ _ _ _"}
                      </span>
                    </div>
                    <button
                      onClick={handleBuyHint}
                      className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold text-xs px-3 py-2 rounded-full transition-all shadow-lg hover:shadow-yellow-500/30"
                      title="Reveal a letter (10 coins)"
                    >
                      <span>💡</span>
                      <span>Hint</span>
                      <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">10¢</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Timer */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${timer < 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>
                <span className="text-2xl">⏱️</span>
                <span className={`text-2xl font-mono font-bold ${timer < 10 ? 'text-white' : 'text-green-400'}`}>
                  {timer}s
                </span>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Canvas Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-300 relative flex items-center justify-center overflow-hidden p-2 md:p-4">
                  <div className="aspect-square w-full max-w-[600px] max-h-full shadow-2xl rounded-lg overflow-hidden">
                    <CanvasBoard
                      isDrawer={isDrawer}
                      currentColor={color}
                      lineWidth={lineWidth}
                      onClearRef={clearCanvasRef}
                    />
                  </div>
                </div>

                {/* Bottom Toolbar (Drawer Only) */}
                {isDrawer && (
                  <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-center gap-4 shrink-0">
                    {/* Color Picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 uppercase hidden sm:inline">Color</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-purple-400 transition-colors"
                      />
                      {/* Quick Colors */}
                      <div className="flex gap-1">
                        {['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-purple-400 ring-2 ring-purple-400' : 'border-gray-600'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-600" />

                    {/* Brush Sizes */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 uppercase hidden sm:inline">Size</span>
                      <div className="flex gap-2 items-center">
                        {[2, 5, 10, 20].map(size => (
                          <button
                            key={size}
                            onClick={() => setLineWidth(size)}
                            className={`rounded-full bg-white transition-all ${lineWidth === size ? 'ring-2 ring-purple-400' : 'hover:ring-2 hover:ring-gray-400'}`}
                            style={{
                              width: `${Math.min(size + 12, 32)}px`,
                              height: `${Math.min(size + 12, 32)}px`
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-600" />

                    {/* Clear Button */}
                    <button
                      onClick={() => clearCanvasRef.current()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span>🗑️</span>
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Sidebar */}
              <div className="w-full md:w-80 h-48 md:h-auto shrink-0 border-l border-gray-700 bg-gray-800">
                <ChatBox playerId={user.uid} username={user.username} isDrawer={isDrawer} />
              </div>
            </div>
          </div>
        )}

        {phase === GamePhase.ROUND_END && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl text-center border border-purple-500 shadow-2xl">
              <h2 className="text-3xl font-bold mb-4 text-white">Round Over!</h2>
              <p className="text-xl text-gray-300 mb-6">
                The word was: <span className="text-green-400 font-bold">{word}</span>
              </p>
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-400 animate-pulse">Preparing the next masterpiece...</p>
                {/* <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div> */}
              </div>

              {roundWinners.length > 0 && (
                <div className="mt-6 bg-gray-700/50 p-4 rounded-lg w-full">
                  <h3 className="text-sm font-bold text-green-400 uppercase mb-2">Correct Guesses</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {roundWinners.map(name => (
                      <span key={name} className="px-2 py-1 bg-green-900/50 text-green-200 text-xs rounded border border-green-700">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === GamePhase.GAME_OVER && (
          <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl text-center border border-yellow-500 shadow-2xl max-w-lg w-full">
              <h2 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Game Over!</h2>

              <div className="space-y-4 mb-8">
                {rankings.slice(0, 3).map((player, idx) => (
                  <div key={player.id} className={`flex items-center justify-between p-3 rounded ${idx === 0 ? 'bg-yellow-900/40 border border-yellow-500/50' : 'bg-gray-700/50'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-xl w-6 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-amber-600'}`}>#{idx + 1}</span>
                      <span className="font-bold">{player.username}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold">{player.score} pts</span>
                      <span className="text-xs text-yellow-500">
                        +{idx === 0 ? 50 : idx === 1 ? 30 : 15} Coins Bonus
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleLeaveRoom}
                  className="px-8 py-3 bg-purple-600 rounded-lg text-white font-bold hover:bg-purple-500 transition-colors"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;