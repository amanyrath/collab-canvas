/**
 * Message Bubble Component
 * 
 * Displays a single message in the chat interface.
 */

import React from 'react';
import type { AgentMessage } from '../../agent/types';

interface MessageBubbleProps {
  message: AgentMessage;
  isUser: boolean;
  userName: string;
}

export default function MessageBubble({ message, isUser, userName }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Name and timestamp */}
        <div className={`flex items-center gap-2 mb-1 text-xs text-gray-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-medium">{userName}</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

