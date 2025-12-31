import React, { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeColor } from '../contexts/ThemeContext';
import { safeJsonFetch } from '../utils/fetchHelper';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface HighlightedUser {
  username: string;
  highlight_color: string;
}

interface MessageListProps {
  messages: Message[];
}

const THEME_OWN_MESSAGE_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-600',
  blue: 'bg-blue-600',
  violet: 'bg-violet-600',
  rose: 'bg-rose-600',
  amber: 'bg-amber-600',
  cyan: 'bg-cyan-600',
};

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [highlightedUsers, setHighlightedUsers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load highlighted usernames for display
  useEffect(() => {
    const loadHighlightedUsers = async () => {
      try {
        const data = await safeJsonFetch('/api/highlighted_usernames') as HighlightedUser[];
        const map = new Map<string, string>();
        data.forEach(h => map.set(h.username.toLowerCase(), h.highlight_color));
        setHighlightedUsers(map);
      } catch (err) {
        console.error('Failed to load highlighted users:', err);
      }
    };
    loadHighlightedUsers();
  }, []);

  const isAdmin = (username: string) => username.toLowerCase() === 'admin';
  const isHighlighted = (username: string) => highlightedUsers.has(username.toLowerCase());
  const getHighlightColor = (username: string) => {
    if (isAdmin(username)) return '#ef4444'; // Bold red for admin
    return highlightedUsers.get(username.toLowerCase()) || null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 overscroll-contain">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-500 dark:text-neutral-400 text-sm sm:text-base px-4 text-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.user_id === user?.id;
          const isSystemMessage = message.user_id === 'system';
          const isAdminMessage = isAdmin(message.username);
          const messageHighlighted = isHighlighted(message.username) || isAdminMessage;
          const highlightColor = getHighlightColor(message.username);

          if (isSystemMessage) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="px-3 py-1.5 bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-full text-xs sm:text-sm">
                  {message.content}
                </div>
              </div>
            );
          }

          // Determine message box style based on highlight
          const getMessageBoxStyle = () => {
            if (isOwnMessage) {
              // Own message - use highlight color as background if highlighted
              if (messageHighlighted && highlightColor) {
                return {
                  backgroundColor: highlightColor,
                  color: 'white',
                };
              }
              return {}; // default emerald
            } else {
              // Other's message - highlight with border and background tint
              if (messageHighlighted && highlightColor) {
                return {
                  backgroundColor: `${highlightColor}12`,
                  borderLeft: `3px solid ${highlightColor}`,
                  boxShadow: `0 0 12px ${highlightColor}20`,
                };
              }
              return {};
            }
          };

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm ${
                  isOwnMessage
                    ? messageHighlighted && highlightColor ? 'text-white' : `${THEME_OWN_MESSAGE_CLASSES[themeColor]} text-white`
                    : messageHighlighted ? '' : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 border border-slate-200 dark:border-neutral-700'
                }`}
                style={getMessageBoxStyle()}
              >
                {!isOwnMessage && (
                  <div 
                    className="font-semibold text-xs sm:text-sm mb-1 flex items-center gap-1"
                    style={{ 
                      color: highlightColor || '#059669',
                      textShadow: messageHighlighted ? `0 0 8px ${highlightColor}40` : 'none'
                    }}
                  >
                    {isAdminMessage && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-red-500 text-white text-[10px] font-bold mr-1">A</span>
                    )}
                    {messageHighlighted && !isAdminMessage && (
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: highlightColor || undefined }} />
                    )}
                    {message.username}
                    {messageHighlighted && (
                      <span style={{ color: highlightColor || undefined }}>★</span>
                    )}
                  </div>
                )}
                <div className={`break-words text-sm sm:text-base ${!isOwnMessage && messageHighlighted ? 'text-slate-800 dark:text-slate-100' : ''}`}>
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    isOwnMessage 
                      ? messageHighlighted ? 'text-white/70' : 'text-emerald-100' 
                      : 'text-slate-500 dark:text-neutral-400'
                  }`}
                >
                  {formatDistanceToNow(message.created_at)}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
