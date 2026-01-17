import React, { useState, useEffect } from 'react';
import type { Room } from '../types';

interface LobbyProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onSearch: (query: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ rooms, onJoinRoom, onCreateRoom, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm);
    }, 500); // Debounce 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, onSearch]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400">
        Game Lobby
      </h2>

      <div className="space-y-4">
        <button
          onClick={onCreateRoom}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg text-white font-bold text-lg shadow-lg transform transition hover:scale-105"
        >
          Create New Room
        </button>

        <div className="relative">
          <input
            type="text"
            placeholder="Search Rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-400">Available Rooms</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <div className="space-y-2 h-64 overflow-y-auto pr-2">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-500 py-8 italic">
              {searchTerm ? "No rooms match your search." : "No active rooms. Create one!"}
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
              >
                <div>
                  <div className="font-bold text-white">{room.name}</div>
                  <div className="text-xs text-gray-400">
                    Players: {room.currentPlayers}/{room.maxPlayers}
                  </div>
                </div>
                <button
                  onClick={() => onJoinRoom(room.id)}
                  disabled={room.currentPlayers >= room.maxPlayers}
                  className={`px-3 py-1 rounded text-sm font-semibold ${room.currentPlayers >= room.maxPlayers
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                >
                  {room.currentPlayers >= room.maxPlayers ? 'Full' : 'Join'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};