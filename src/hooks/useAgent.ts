/**
 * React Hook for AI Canvas Agent
 * 
 * Provides interface for executing agent commands, managing
 * conversation history, and handling responses.
 */

import { useState, useCallback, useRef } from 'react';
import { executeCommand, executeCommandWithStreaming } from '../agent/executor';
import { executeAgentActions } from '../agent/actionExecutor';
import type { AgentMessage, UserContext, AgentResponse } from '../agent/types';
import type { ExecutionResult } from '../agent/actionExecutor';

export interface UseAgentOptions {
  userContext: UserContext;
  onSuccess?: (response: AgentResponse, result: ExecutionResult) => void;
  onError?: (error: Error) => void;
  maxHistoryLength?: number;
  enableStreaming?: boolean;
}

export interface UseAgentReturn {
  // State
  messages: AgentMessage[];
  isProcessing: boolean;
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
  
  // Actions
  sendCommand: (command: string) => Promise<void>;
  clearHistory: () => void;
  retryLastCommand: () => Promise<void>;
  cancelCurrentCommand: () => void;
  
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
    enableStreaming = true,
  } = options;

  // State
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);

  // Refs
  const lastCommandRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel the current command execution
   */
  const cancelCurrentCommand = useCallback(() => {
    console.log('🛑 Canceling current command...');
    
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset all processing states
    setIsProcessing(false);
    setIsStreaming(false);
    setStreamingText('');
    
    console.log('✅ Command canceled and state reset');
  }, []);

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

    // Create abort controller for this command
    abortControllerRef.current = new AbortController();

    // Clear previous error and streaming state
    setError(null);
    setStreamingText('');
    setIsProcessing(true);

    // Add user message
    addMessage('user', command);

    try {
      // Get recent messages for context (last 5 exchanges = 10 messages)
      const recentMessages = messages.slice(-10);

      console.log('🤖 Sending command to agent:', command);

      let agentResponse: AgentResponse;

      if (enableStreaming) {
        // Execute with streaming
        setIsStreaming(true);
        
        // Add timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
        });

        agentResponse = await Promise.race([
          executeCommandWithStreaming(
            command,
            userContext,
            (token) => {
              // Update streaming text as tokens arrive
              setStreamingText(prev => prev + token);
            },
            recentMessages
          ),
          timeoutPromise
        ]);

        setIsStreaming(false);
      } else {
        // Execute without streaming (with timeout)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
        });

        agentResponse = await Promise.race([
          executeCommand(command, userContext, recentMessages),
          timeoutPromise
        ]);
      }

      console.log('✅ Agent response received:', agentResponse);
      setLastResponse(agentResponse);

      // Clear streaming text now that we have the response
      setStreamingText('');

      // Execute the actions
      console.log('🔨 Executing actions...');
      const executionStartTime = Date.now();
      const executionResult = await executeAgentActions(
        agentResponse,
        userContext
      );
      console.log(`✅ Execution completed in ${Date.now() - executionStartTime}ms`);
      console.log('✅ Execution result:', executionResult);
      setLastExecutionResult(executionResult);

      // Add assistant message
      console.log('💬 Adding assistant message:', agentResponse.summary);
      addMessage('assistant', agentResponse.summary);
      console.log('✅ Message added to history');

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
      // Check if this was an abort - if so, don't show error
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏹️ Command was canceled by user');
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Agent error:', err);
      
      setError(errorMessage);
      addMessage('assistant', `Sorry, I encountered an error: ${errorMessage}`);

      // Call error callback
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      console.log('🏁 Cleaning up: setting isProcessing to false');
      abortControllerRef.current = null;
      
      // Force state updates
      setIsProcessing(false);
      setIsStreaming(false);
      setStreamingText('');
      setError(null); // Clear any previous errors
      
      console.log('✅ Agent command flow complete - UI should be ready for next command');
    }
  }, [messages, userContext, addMessage, onSuccess, onError, enableStreaming]);

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
    isStreaming,
    streamingText,
    error,
    
    // Actions
    sendCommand,
    clearHistory,
    retryLastCommand,
    cancelCurrentCommand,
    
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

