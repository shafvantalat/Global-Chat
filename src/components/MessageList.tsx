import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm sm:text-base px-4 text-center">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.user_id === user?.id;
          const isSystemMessage = message.user_id === 'system';

          if (isSystemMessage) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs sm:text-sm">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                } rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm`}
              >
                {!isOwnMessage && (
                  <div className="font-semibold text-xs sm:text-sm mb-1 text-blue-600 dark:text-blue-400">
                    {message.username}
                  </div>
                )}
                <div className="break-words text-sm sm:text-base">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
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
