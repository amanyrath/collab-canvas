/**
 * Agent Executor for AI Canvas Agent
 * 
 * This module implements direct LLM calls to generate structured JSON
 * responses for canvas manipulation.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { getLLM } from './llm';
import { createSystemPrompt, buildAgentContext } from './prompts';
import type { UserContext, AgentMessage, AgentResponse } from './types';

/**
 * Agent executor configuration
 */
export interface AgentConfig {
  verbose?: boolean;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  verbose: true,
};

/**
 * Execute a user command through the LLM
 * 
 * @param userInput - The natural language command from the user
 * @param userContext - User information (ID, name, color)
 * @param recentMessages - Recent conversation history for context
 * @returns Agent response with actions and summary
 */
export async function executeCommand(
  userInput: string,
  userContext: UserContext,
  recentMessages: AgentMessage[] = []
): Promise<AgentResponse> {
  const startTime = Date.now();
  try {
    console.log('⏱️ Starting LLM request...');
    // Get LLM instance
    const llm = getLLM();

    // Build context
    const context = buildAgentContext(userContext, recentMessages);
    
    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context.canvasState, userContext);

    // Create prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    // Create chain
    const chain = prompt.pipe(llm);

    // Execute
    const result = await chain.invoke({
      input: userInput,
    });

    // Parse and return result
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const duration = Date.now() - startTime;
    console.log(`✅ LLM responded in ${duration}ms`);
    return parseAgentOutput(content);
  } catch (error) {
    console.error('Agent execution error:', error);
    
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error('Cannot reach OpenAI API. Check your internet connection or network firewall.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Network error connecting to OpenAI. Please check your connection.');
      }
      throw new Error(`Agent failed: ${error.message}`);
    }
    throw new Error('Unknown agent error');
  }
}

/**
 * Parse LLM output into structured response
 */
function parseAgentOutput(output: string): AgentResponse {
  try {
    // Look for JSON in the response
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        actions: parsed.actions || [],
        summary: parsed.summary || output,
        reasoning: parsed.reasoning,
      };
    }
  } catch (error) {
    console.warn('Failed to parse JSON from LLM output:', error);
  }

  // Fallback: return output as summary
  return {
    actions: [],
    summary: output,
  };
}

/**
 * Streaming version of command execution
 * 
 * Uses LangChain's streaming capabilities to provide real-time token updates
 * 
 * @param userInput - The natural language command
 * @param userContext - User information
 * @param onToken - Callback for each token
 * @param recentMessages - Conversation history
 * @returns Final agent response
 */
export async function executeCommandWithStreaming(
  userInput: string,
  userContext: UserContext,
  onToken: (token: string) => void,
  recentMessages: AgentMessage[] = []
): Promise<AgentResponse> {
  try {
    console.log('🌊 Starting streaming execution...');

    // Get LLM instance
    const llm = getLLM();

    // Build context
    const context = buildAgentContext(userContext, recentMessages);
    
    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context.canvasState, userContext);

    // Create prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    // Create chain
    const chain = prompt.pipe(llm);
    
    let fullResponse = '';

    // Stream the response
    const stream = await chain.stream({
      input: userInput,
    });

    // Process each chunk
    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === 'string' && content) {
        fullResponse += content;
        onToken(content);
      }
    }

    console.log('✅ Streaming complete');

    // Parse the full response
    return parseAgentOutput(fullResponse);
  } catch (error) {
    console.error('Streaming execution error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error('Cannot reach OpenAI API. Check your internet connection or network firewall.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Network error connecting to OpenAI. Please check your connection.');
      }
      throw new Error(`Streaming execution failed: ${error.message}`);
    }
    throw new Error('Unknown streaming error');
  }
}

/**
 * Validate agent response before execution
 * 
 * Checks that actions are well-formed and safe to execute
 */
export function validateAgentResponse(response: AgentResponse): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check actions array exists
  if (!Array.isArray(response.actions)) {
    errors.push('Actions must be an array');
    return { valid: false, errors };
  }

  // Validate each action
  response.actions.forEach((action, index) => {
    // Check action type
    const validTypes = ['CREATE', 'MOVE', 'RESIZE', 'DELETE', 'ARRANGE', 'UPDATE'];
    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${index}: Invalid type "${action.type}"`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'CREATE':
        if (!action.shape || !['rectangle', 'circle'].includes(action.shape)) {
          errors.push(`Action ${index}: Invalid or missing shape type`);
        }
        if (typeof action.x !== 'number' || typeof action.y !== 'number') {
          errors.push(`Action ${index}: Missing or invalid position`);
        }
        break;

      case 'MOVE':
      case 'RESIZE':
      case 'DELETE':
      case 'UPDATE':
        if (!action.shapeId && !action.shapeIds) {
          errors.push(`Action ${index}: Missing shapeId or shapeIds`);
        }
        break;

      case 'ARRANGE':
        if (!Array.isArray(action.shapeIds) || action.shapeIds.length === 0) {
          errors.push(`Action ${index}: Arrange requires non-empty shapeIds array`);
        }
        if (!action.layout || !['horizontal', 'vertical', 'grid'].includes(action.layout)) {
          errors.push(`Action ${index}: Invalid or missing layout`);
        }
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get agent statistics for monitoring
 */
export interface AgentStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  totalTokensUsed: number;
}

let stats: AgentStats = {
  totalCommands: 0,
  successfulCommands: 0,
  failedCommands: 0,
  averageExecutionTime: 0,
  totalTokensUsed: 0,
};

export function getAgentStats(): AgentStats {
  return { ...stats };
}

export function resetAgentStats(): void {
  stats = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageExecutionTime: 0,
    totalTokensUsed: 0,
  };
}

/**
 * Track command execution for statistics
 */
export function trackCommandExecution(
  success: boolean,
  executionTime: number,
  tokensUsed: number = 0
): void {
  stats.totalCommands++;
  
  if (success) {
    stats.successfulCommands++;
  } else {
    stats.failedCommands++;
  }

  // Update running average
  const totalTime = stats.averageExecutionTime * (stats.totalCommands - 1) + executionTime;
  stats.averageExecutionTime = totalTime / stats.totalCommands;

  stats.totalTokensUsed += tokensUsed;
}

