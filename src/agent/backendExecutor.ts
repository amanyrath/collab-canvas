/**
 * Backend Executor for AI Agent
 * 
 * Uses the Vercel serverless API instead of direct LLM calls
 * This keeps API keys secure on the server-side
 */

import { sendAgentMessage } from '../api/agentApi';
import type { AgentResponse, UserContext, AgentMessage } from './types';

/**
 * Execute a command using the backend API
 * 
 * @param command - The user's command
 * @param context - Canvas and user context
 * @param conversationHistory - Recent messages for context
 * @returns Agent response with actions
 */
export async function executeCommandViaBackend(
  command: string,
  context: UserContext,
  _conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  console.log('🌐 Executing command via backend API');

  try {
    // Prepare canvas context
    const canvasContext = {
      shapes: (context as any).canvasState?.shapes || [],
      selectedShapes: (context as any).canvasState?.selectedShapeIds || [],
      viewport: {
        x: (context as any).canvasState?.viewport?.x || 0,
        y: (context as any).canvasState?.viewport?.y || 0,
        scale: (context as any).canvasState?.viewport?.scale || 1,
      },
    };

    // Send request to backend
    const response = await sendAgentMessage({
      message: command,
      canvasContext,
      userId: context.userId,
    });

    if (!response.success) {
      throw new Error(response.error || response.message);
    }

    // Convert API response to AgentResponse format
    const agentResponse: AgentResponse = {
      actions: response.action ? [response.action.properties as any] : [],
      summary: response.message,
    };

    console.log('✅ Backend response received:', agentResponse);
    return agentResponse;

  } catch (error) {
    console.error('❌ Backend executor error:', error);
    
    // Return error as agent response
    return {
      actions: [],
      summary: error instanceof Error 
        ? `Error: ${error.message}` 
        : 'An unknown error occurred',
    };
  }
}

/**
 * Streaming is not yet supported via backend API
 * This is a placeholder that falls back to non-streaming
 */
export async function executeCommandViaBackendWithStreaming(
  command: string,
  context: UserContext,
  onToken: (token: string) => void,
  _conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  console.log('ℹ️ Streaming not yet supported via backend, using standard execution');
  
  // For now, just use non-streaming and return the full response
  const response = await executeCommandViaBackend(command, context, _conversationHistory);
  
  // Simulate streaming by sending the message all at once
  onToken(response.summary);
  
  return response;
}

