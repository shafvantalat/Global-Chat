import React, { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && cooldown === 0) {
      onSendMessage(message);
      setMessage('');
      setCooldown(2);
    }
  };

  const isDisabled = disabled || !message.trim() || cooldown > 0;

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : "Type a message..."}
          disabled={disabled || cooldown > 0}
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={cooldown > 0 ? `Wait ${cooldown} seconds` : 'Send message'}
        >
          {cooldown > 0 ? (
            <Clock className="w-5 h-5" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
};
