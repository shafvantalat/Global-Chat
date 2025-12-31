import React, { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { useTheme, ThemeColor } from '../contexts/ThemeContext';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

const THEME_BUTTON_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
  rose: 'bg-rose-600 hover:bg-rose-700',
  amber: 'bg-amber-600 hover:bg-amber-700',
  cyan: 'bg-cyan-600 hover:bg-cyan-700',
};

const THEME_RING_CLASSES: Record<ThemeColor, string> = {
  emerald: 'focus:ring-emerald-500 focus:border-emerald-500',
  blue: 'focus:ring-blue-500 focus:border-blue-500',
  violet: 'focus:ring-violet-500 focus:border-violet-500',
  rose: 'focus:ring-rose-500 focus:border-rose-500',
  amber: 'focus:ring-amber-500 focus:border-amber-500',
  cyan: 'focus:ring-cyan-500 focus:border-cyan-500',
};

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const { themeColor } = useTheme();
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
    <form id="message-input" onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : "Type a message..."}
          disabled={disabled || cooldown > 0}
          className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 ${THEME_RING_CLASSES[themeColor]} focus:bg-white dark:focus:bg-neutral-900 transition-all disabled:opacity-50 placeholder-slate-400 dark:placeholder-neutral-500`}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className={`px-4 sm:px-6 py-2.5 sm:py-3 ${THEME_BUTTON_CLASSES[themeColor]} text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md`}
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
