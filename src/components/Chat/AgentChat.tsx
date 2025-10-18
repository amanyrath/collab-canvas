/**
 * AI Canvas Agent Chat Component
 * 
 * Provides a chat interface for users to interact with the AI agent.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAgent, useSuggestedCommands } from '../../hooks/useAgent';
import { useAuth } from '../../hooks/useAuth';
import type { UserContext } from '../../agent/types';
import MessageBubble from './MessageBubble';

interface AgentChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentChat({ isOpen, onClose }: AgentChatProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useSuggestedCommands();
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Create user context from auth
  const userContext: UserContext | null = user ? {
    userId: user.uid,
    displayName: user.displayName,
    cursorColor: user.cursorColor,
  } : null;

  // Initialize agent hook
  const {
    messages,
    isProcessing,
    isStreaming,
    streamingText,
    error,
    sendCommand,
    cancelCurrentCommand,
    lastExecutionResult,
  } = useAgent({
    userContext: userContext!,
    enableStreaming: true,
    onSuccess: (_response, result) => {
      console.log('✅ Command executed successfully:', result);
    },
    onError: (error) => {
      console.error('❌ Command failed:', error);
    },
  });

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);
  
  // Also scroll when processing completes
  useEffect(() => {
    if (!isProcessing) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isProcessing]);

  // Debug: Log when isProcessing changes
  useEffect(() => {
    console.log('🔄 Component state changed - isProcessing:', isProcessing);
  }, [isProcessing]);

  // Focus input and reset state when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Safety: ensure we're not stuck in processing state when reopening
      if (isProcessing) {
        console.log('⚠️ Chat reopened while processing - canceling any stuck state');
        cancelCurrentCommand();
      }
    }
  }, [isOpen, isProcessing, cancelCurrentCommand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submit - Current state:', { 
      isProcessing, 
      inputValue: inputValue.trim(),
      hasUserContext: !!userContext 
    });
    
    if (!inputValue.trim() || !userContext) {
      console.log('⚠️ Submit blocked:', !inputValue.trim() ? 'empty input' : 'no user context');
      return;
    }

    const command = inputValue.trim();
    setInputValue('');
    setShowSuggestions(false);
    
    await sendCommand(command);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    // Cancel any ongoing command and reset state
    cancelCurrentCommand();
    // Close the window
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[32rem] bg-white rounded-lg shadow-2xl border border-gray-200 flex items-center justify-center p-6">
        <p className="text-gray-500">Please log in to use the AI agent</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[32rem] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          <h3 className="font-semibold text-gray-800">AI Canvas Agent</h3>
          {import.meta.env.DEV && isProcessing && (
            <span className="text-xs text-yellow-600">(Processing)</span>
          )}
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                console.log('🐛 DEBUG STATE:', { 
                  isProcessing, 
                  isStreaming, 
                  streamingText, 
                  error, 
                  messagesCount: messages.length,
                  inputValue: inputValue,
                  inputEmpty: !inputValue.trim(),
                  buttonShouldBeDisabled: !inputValue.trim() || isProcessing
                });
                if (isProcessing) {
                  console.log('   Forcing cancel...');
                  cancelCurrentCommand();
                }
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="Debug: Check state"
            >
              🐛
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="mb-4">
              <span className="text-4xl">🤖</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Hi {user.displayName}!
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              I can help you create and arrange shapes on the canvas.
            </p>
            
            {showSuggestions && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Try these commands:</p>
                {suggestions.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="block w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-md text-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isUser={message.role === 'user'}
            userName={message.role === 'user' ? user.displayName : 'AI Agent'}
          />
        ))}

        {/* Streaming response with full details */}
        {isStreaming && streamingText && (
          <div className="max-w-[80%]">
            <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
              <span className="font-medium">AI Agent</span>
              <span className="flex gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
              <p className="text-sm whitespace-pre-wrap break-words">
                {streamingText}
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
              </p>
            </div>
          </div>
        )}
        
        {/* Simple "Thinking..." indicator before streaming starts */}
        {isProcessing && !isStreaming && !streamingText && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Thinking...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Execution result */}
        {lastExecutionResult && lastExecutionResult.failureCount > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
            ⚠️ {lastExecutionResult.successCount} succeeded, {lastExecutionResult.failureCount} failed
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me to create shapes..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Send
          </button>
        </div>
        
        {/* Quick suggestions */}
        {!showSuggestions && messages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestions.slice(0, 3).map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

