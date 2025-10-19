/**
 * Agent Executor for AI Canvas Agent
 * 
 * This module implements OpenAI function calling for canvas manipulation.
 */

import { HumanMessage, SystemMessage, AIMessage, FunctionMessage } from '@langchain/core/messages';
import { getLLM } from './llm';
import { STATIC_SYSTEM_PROMPT, createDynamicContext, buildAgentContext } from './prompts';
import { functions, executeFunction } from './tools/functions';
import type { UserContext, AgentMessage, AgentResponse } from './types';

/**
 * Agent executor configuration
 */
export interface AgentConfig {
  verbose?: boolean;
}

// Removed unused config - can be added back if needed
// const DEFAULT_AGENT_CONFIG: AgentConfig = {
//   verbose: true,
// };

/**
 * Execute a user command through the LLM with function calling
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
    console.log('⏱️ Starting function calling execution...');
    
    // Get LLM instance with function calling
    const llm = getLLM();

    // Build context
    const context = buildAgentContext(userContext, recentMessages);
    
    // Create dynamic context (canvas state + user info)
    const dynamicContext = createDynamicContext(context.canvasState, userContext);

    // Build messages array using LangChain message types
    const messages = [
      new SystemMessage(STATIC_SYSTEM_PROMPT),
      new SystemMessage(dynamicContext),
      new HumanMessage(userInput),
    ];

    // Call LLM with functions
    const result = await llm.invoke(messages, {
      functions: functions,
      function_call: 'auto' as any, // LangChain type issue
    });

    const duration = Date.now() - startTime;
    console.log(`✅ LLM responded in ${duration}ms`);

    // Check if LLM wants to call functions
    if (result.additional_kwargs?.function_call) {
      console.log('🔧 LLM requested function call');
      
      const functionCall = result.additional_kwargs.function_call;
      const functionName = functionCall.name;
      const functionArgs = JSON.parse(functionCall.arguments);
      
      // Execute the function
      const functionResult = await executeFunction(
        functionName,
        functionArgs,
        userContext.userId,
        userContext.displayName
      );
      
      console.log('✅ Function executed:', functionResult);
      
      // Return function result to LLM for final response
      // Create AIMessage with function call
      const aiMessage = new AIMessage({
        content: '',
        additional_kwargs: {
          function_call: functionCall,
        },
      });
      messages.push(aiMessage);
      
      // Add function result message
      const functionMessage = new FunctionMessage({
        name: functionName,
        content: JSON.stringify(functionResult),
      });
      messages.push(functionMessage);
      
      // Get final response from LLM
      const finalResult = await llm.invoke(messages);
      const finalContent = typeof finalResult.content === 'string' 
        ? finalResult.content 
        : JSON.stringify(finalResult.content);
      
      // Parse the response - LLM might return JSON actions or just text
      const parsed = parseAgentOutput(finalContent);
      return parsed;
    }

    // No function call - parse direct response
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
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
  console.log('🔍 Parsing agent output, length:', output.length);
  console.log('📝 First 200 chars:', output.substring(0, 200));
  
  try {
    // Remove markdown code blocks if present
    let cleanedOutput = output.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON object
    const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('✅ Found JSON match, attempting parse...');
      const parsed = JSON.parse(jsonMatch[0]);
      
      console.log('✅ JSON parsed successfully');
      console.log('📊 Actions count:', parsed.actions?.length || 0);
      
      return {
        actions: parsed.actions || [],
        summary: parsed.summary || output,
        reasoning: parsed.reasoning,
      };
    } else {
      console.warn('⚠️ No JSON object found in output');
    }
  } catch (error) {
    console.error('❌ Failed to parse JSON from LLM output:', error);
    console.error('📝 Raw output:', output.substring(0, 500));
  }

  // Fallback: return output as summary
  console.warn('⚠️ Falling back to summary-only response');
  return {
    actions: [],
    summary: output,
  };
}

/**
 * Streaming version of command execution with function calling
 * 
 * Note: Function calling doesn't stream well (functions execute then respond)
 * This version will stream the final response after function execution
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
  const startTime = Date.now();
  try {
    console.log('🌊 Starting streaming execution with function calling...');

    // Get LLM instance
    const llm = getLLM();
    console.log(`⏱️ [${Date.now() - startTime}ms] LLM initialized`);

    // Build context
    const context = buildAgentContext(userContext, recentMessages);
    console.log(`⏱️ [${Date.now() - startTime}ms] Context built with ${context.canvasState.shapes.length} shapes`);
    
    // Create dynamic context (canvas state + user info)
    const dynamicContext = createDynamicContext(context.canvasState, userContext);
    console.log(`⏱️ [${Date.now() - startTime}ms] Dynamic context created`);

    // Build messages array using LangChain message types
    const messages = [
      new SystemMessage(STATIC_SYSTEM_PROMPT),
      new SystemMessage(dynamicContext),
      new HumanMessage(userInput),
    ];

    // Call LLM with functions (non-streaming for function detection)
    const result = await llm.invoke(messages, {
      functions: functions,
      function_call: 'auto' as any, // LangChain type issue
    });

    console.log(`⏱️ [${Date.now() - startTime}ms] Initial response received`);

    // Check if LLM wants to call functions
    if (result.additional_kwargs?.function_call) {
      console.log('🔧 LLM requested function call');
      onToken('🔧 Executing function...\n');
      
      const functionCall = result.additional_kwargs.function_call;
      const functionName = functionCall.name;
      const functionArgs = JSON.parse(functionCall.arguments);
      
      // Execute the function
      const functionResult = await executeFunction(
        functionName,
        functionArgs,
        userContext.userId,
        userContext.displayName
      );
      
      console.log('✅ Function executed:', functionResult);
      onToken(`✅ Function ${functionName} completed\n`);
      
      // Return function result to LLM for final response
      // Create AIMessage with function call
      const aiMessage = new AIMessage({
        content: '',
        additional_kwargs: {
          function_call: functionCall,
        },
      });
      messages.push(aiMessage);
      
      // Add function result message
      const functionMessage = new FunctionMessage({
        name: functionName,
        content: JSON.stringify(functionResult),
      });
      messages.push(functionMessage);
      
      // Get final response with streaming
      let fullResponse = '';
      const stream = await llm.stream(messages);
      
      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === 'string' && content) {
          fullResponse += content;
          onToken(content);
        }
      }
      
      console.log(`⏱️ [${Date.now() - startTime}ms] Streaming complete`);
      
      // Parse the response - LLM might return JSON actions or just text
      const parsed = parseAgentOutput(fullResponse);
      return parsed;
    }

    // No function call - stream the direct response
    console.log('💬 No function call needed, streaming response');
    let fullResponse = '';
    const stream = await llm.stream(messages);

    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === 'string' && content) {
        fullResponse += content;
        onToken(content);
      }
    }

    console.log(`⏱️ [${Date.now() - startTime}ms] Streaming complete`);
    const parsed = parseAgentOutput(fullResponse);
    return parsed;
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
    const validTypes = ['CREATE', 'MOVE', 'RESIZE', 'DELETE', 'ARRANGE', 'UPDATE', 'ALIGN', 'BULK_CREATE', 'DELETE_ALL'];
    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${index}: Invalid type "${action.type}"`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'CREATE':
        if (!action.shape || !['rectangle', 'circle', 'triangle'].includes(action.shape)) {
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

      case 'ALIGN':
        if (!Array.isArray(action.shapeIds) || action.shapeIds.length === 0) {
          errors.push(`Action ${index}: Align requires non-empty shapeIds array`);
        }
        const validAlignments = ['left', 'right', 'top', 'bottom', 'center-x', 'center-y'];
        if (!action.alignment || !validAlignments.includes(action.alignment)) {
          errors.push(`Action ${index}: Invalid or missing alignment type`);
        }
        break;

      case 'BULK_CREATE':
        if (typeof action.count !== 'number') {
          errors.push(`Action ${index}: Missing count`);
        } else if (action.count < 1 || action.count > 1000) {
          errors.push(`Action ${index}: count must be between 1 and 1000`);
        }
        break;

      case 'DELETE_ALL':
        // No validation needed - just clears everything
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

