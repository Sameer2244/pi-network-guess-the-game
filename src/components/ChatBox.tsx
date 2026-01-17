import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { socketService } from '../services/socketService';

interface ChatBoxProps {
  isDrawer?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ isDrawer }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socketService.on('chat_message', handleMessage);
    socketService.on('system_message', (text: string) => {
      handleMessage({
        id: Date.now().toString(),
        playerId: 'system',
        username: 'SYSTEM',
        text: text,
        type: 'system',
        timestamp: Date.now()
      });
    });

    return () => {
      socketService.off('chat_message', handleMessage);
    };
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isDrawer) return;

    socketService.emit('send_message', input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-2 border-b border-gray-700 font-bold text-gray-300">
        Chat & Guesses
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm p-1.5 rounded break-words ${msg.type === 'guess'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : msg.type === 'system'
                ? 'bg-blue-900/30 text-blue-300 text-center italic'
                : 'bg-gray-700/50 text-white'
              }`}
          >
            {msg.type !== 'system' && (
              <span className="font-bold text-gray-400 mr-1">{msg.username}:</span>
            )}
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isDrawer ? "Drawing... (Chat Disabled)" : "Type guess here..."}
          disabled={isDrawer}
          className={`flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-pi-purple ${isDrawer ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <button
          type="submit"
          disabled={isDrawer}
          className={`bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm font-semibold transition-colors ${isDrawer ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Send
        </button>
      </form>
    </div>
  );
};