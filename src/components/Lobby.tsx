import React from 'react';
import type { Room } from '../types';

interface LobbyProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ rooms, onJoinRoom, onCreateRoom }) => {
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

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-400">Available Rooms</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <div className="space-y-2 h-64 overflow-y-auto pr-2">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-500 py-8 italic">
              No active rooms. Create one!
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