/**
 * React Hook for AI Canvas Agent
 * 
 * Provides interface for executing agent commands, managing
 * conversation history, and handling responses.
 */

import { useState, useCallback, useRef } from 'react';
import { executeCommand } from '../agent/executor';
import { executeAgentActions } from '../agent/actionExecutor';
import type { AgentMessage, UserContext, AgentResponse } from '../agent/types';
import type { ExecutionResult } from '../agent/actionExecutor';

export interface UseAgentOptions {
  userContext: UserContext;
  onSuccess?: (response: AgentResponse, result: ExecutionResult) => void;
  onError?: (error: Error) => void;
  maxHistoryLength?: number;
}

export interface UseAgentReturn {
  // State
  messages: AgentMessage[];
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  sendCommand: (command: string) => Promise<void>;
  clearHistory: () => void;
  retryLastCommand: () => Promise<void>;
  
  // Info
  lastResponse: AgentResponse | null;
  lastExecutionResult: ExecutionResult | null;
}

/**
 * Main hook for interacting with the AI agent
 */
export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const {
    userContext,
    onSuccess,
    onError,
    maxHistoryLength = 50,
  } = options;

  // State
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);

  // Refs
  const lastCommandRef = useRef<string | null>(null);

  /**
   * Add a message to the conversation history
   */
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const newMessage: AgentMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Trim if exceeds max length
      if (updated.length > maxHistoryLength) {
        return updated.slice(-maxHistoryLength);
      }
      return updated;
    });
  }, [maxHistoryLength]);

  /**
   * Send a command to the agent and execute the response
   */
  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim()) {
      return;
    }

    // Store for retry
    lastCommandRef.current = command;

    // Clear previous error
    setError(null);
    setIsProcessing(true);

    // Add user message
    addMessage('user', command);

    try {
      // Get recent messages for context (last 5 exchanges = 10 messages)
      const recentMessages = messages.slice(-10);

      console.log('🤖 Sending command to agent:', command);

      // Execute command through agent
      const agentResponse = await executeCommand(
        command,
        userContext,
        recentMessages
      );

      console.log('✅ Agent response:', agentResponse);
      setLastResponse(agentResponse);

      // Execute the actions
      console.log('🔨 Executing actions...');
      const executionResult = await executeAgentActions(
        agentResponse,
        userContext
      );

      console.log('✅ Execution result:', executionResult);
      setLastExecutionResult(executionResult);

      // Add assistant message
      addMessage('assistant', agentResponse.summary);

      // Call success callback
      if (onSuccess) {
        onSuccess(agentResponse, executionResult);
      }

      // If execution had failures, add note
      if (executionResult.failureCount > 0) {
        const failureMessage = `Note: ${executionResult.failureCount} of ${executionResult.totalActions} actions failed to execute.`;
        addMessage('assistant', failureMessage);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Agent error:', err);
      
      setError(errorMessage);
      addMessage('assistant', `Sorry, I encountered an error: ${errorMessage}`);

      // Call error callback
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [messages, userContext, addMessage, onSuccess, onError]);

  /**
   * Retry the last command
   */
  const retryLastCommand = useCallback(async () => {
    if (lastCommandRef.current) {
      await sendCommand(lastCommandRef.current);
    }
  }, [sendCommand]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastResponse(null);
    setLastExecutionResult(null);
    lastCommandRef.current = null;
  }, []);

  return {
    // State
    messages,
    isProcessing,
    error,
    
    // Actions
    sendCommand,
    clearHistory,
    retryLastCommand,
    
    // Info
    lastResponse,
    lastExecutionResult,
  };
}

/**
 * Hook for getting suggested commands based on canvas state
 */
export function useSuggestedCommands() {
  const suggestions = [
    'Create a red circle at 200, 300',
    'Make a login form',
    'Create a 3x3 grid of shapes',
    'Arrange all shapes horizontally',
    'Create a navigation bar',
    'Make a blue rectangle',
    'Create a color palette',
    'Design a card layout',
  ];

  return suggestions;
}

