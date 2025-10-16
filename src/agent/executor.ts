/**
 * Agent Executor for AI Canvas Agent
 * 
 * This module implements the LangChain ReAct agent that combines
 * the LLM, tools, and prompts into a reasoning agent.
 */

import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { getLLM } from './llm';
import { allTools } from './tools';
import { createSystemPrompt, buildAgentContext } from './prompts';
import type { UserContext, AgentMessage, AgentResponse } from './types';

/**
 * Agent executor configuration
 */
export interface AgentConfig {
  maxIterations?: number;
  verbose?: boolean;
  handleParsingErrors?: boolean;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: 5,
  verbose: true,
  handleParsingErrors: true,
};

/**
 * Create the agent executor
 * 
 * This is the main entry point for creating a configured agent
 * that can process user commands and execute canvas actions.
 */
export async function createAgent(
  userContext: UserContext,
  recentMessages: AgentMessage[] = [],
  config: AgentConfig = {}
): Promise<AgentExecutor> {
  // Merge configs
  const finalConfig = { ...DEFAULT_AGENT_CONFIG, ...config };

  // Get LLM instance
  const llm = getLLM();

  // Build context
  const context = buildAgentContext(userContext, recentMessages);
  
  // Create system prompt with context
  const systemPrompt = createSystemPrompt(context.canvasState, userContext);

  // Create prompt template with required ReAct variables
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt + '\n\nYou have access to the following tools:\n{tools}\n\nTool names: {tool_names}'],
    ['human', '{input}'],
    ['assistant', '{agent_scratchpad}'],
  ]);

  // Create ReAct agent
  const agent = await createReactAgent({
    llm,
    tools: allTools,
    prompt,
  });

  // Create agent executor
  const executor = new AgentExecutor({
    agent,
    tools: allTools,
    maxIterations: finalConfig.maxIterations,
    verbose: finalConfig.verbose,
    handleParsingErrors: finalConfig.handleParsingErrors,
    returnIntermediateSteps: true, // For debugging and transparency
  });

  return executor;
}

/**
 * Execute a user command through the agent
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
  try {
    // Create agent
    const agent = await createAgent(userContext, recentMessages);

    // Execute
    const result = await agent.invoke({
      input: userInput,
    });

    // Parse and return result
    return parseAgentOutput(result);
  } catch (error) {
    console.error('Agent execution error:', error);
    throw new Error(
      error instanceof Error 
        ? `Agent failed: ${error.message}` 
        : 'Unknown agent error'
    );
  }
}

/**
 * Parse agent output into structured response
 */
function parseAgentOutput(result: any): AgentResponse {
  // Try to parse JSON from output
  const output = result.output || result.text || '';
  
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
    console.warn('Failed to parse JSON from agent output:', error);
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

    // Create agent with streaming enabled
    const agent = await createAgent(userContext, recentMessages, {
      verbose: false, // Disable verbose logging for cleaner streaming
    });

    // Build context for system prompt
    const context = buildAgentContext(userContext, recentMessages);
    
    let fullResponse = '';
    let actions: any[] = [];
    let reasoning = '';

    // Stream the response
    const result = await agent.stream({
      input: userInput,
    });

    // Process each chunk
    for await (const chunk of result) {
      // Handle different chunk types from LangChain
      if (chunk.agent) {
        // Agent reasoning/output chunk
        const output = chunk.agent.messages?.[0]?.content || '';
        if (typeof output === 'string' && output) {
          fullResponse += output;
          onToken(output);
        }
      } else if (chunk.output) {
        // Final output
        fullResponse = chunk.output;
      }
    }

    console.log('✅ Streaming complete');

    // Parse the full response
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        actions = parsed.actions || [];
        reasoning = parsed.reasoning;
      }
    } catch (error) {
      console.warn('Failed to parse streamed JSON:', error);
    }

    return {
      actions,
      summary: fullResponse,
      reasoning,
    };
  } catch (error) {
    console.error('Streaming execution error:', error);
    throw new Error(
      error instanceof Error 
        ? `Streaming execution failed: ${error.message}` 
        : 'Unknown streaming error'
    );
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

