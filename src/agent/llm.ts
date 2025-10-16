/**
 * LLM Initialization Module for AI Canvas Agent
 * 
 * This module configures and exports the LangChain ChatOpenAI instance
 * for use by the agent executor.
 */

import { ChatOpenAI } from '@langchain/openai';
import type { AgentConfig } from './types';

/**
 * Default configuration for the LLM
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.3, // Low temperature for deterministic outputs
  streaming: true,  // Enable streaming for better UX
  maxTokens: 1000,  // Reasonable limit for canvas commands
};

/**
 * Initialize the ChatOpenAI instance with configuration
 * 
 * @param config - Optional configuration overrides
 * @returns Configured ChatOpenAI instance
 * 
 * @example
 * ```typescript
 * const llm = initializeLLM({
 *   openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY
 * });
 * ```
 */
export function initializeLLM(config: Partial<AgentConfig> = {}): ChatOpenAI {
  const apiKey = config.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY;

  console.log('🔑 Environment check:', {
    hasConfigKey: !!config.openaiApiKey,
    hasEnvKey: !!import.meta.env.VITE_OPENAI_API_KEY,
    envKeyPrefix: import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 7),
  });

  if (!apiKey) {
    throw new Error(
      'OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file. ' +
      'See SETUP.md for instructions.'
    );
  }

  // Validate API key format (should start with sk-)
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ OpenAI API key format looks incorrect. Expected to start with "sk-"');
    console.error('Key starts with:', apiKey.substring(0, 10));
    throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
  }

  const llmConfig = {
    modelName: config.model || DEFAULT_CONFIG.model,
    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
    streaming: config.streaming ?? DEFAULT_CONFIG.streaming,
    maxTokens: DEFAULT_CONFIG.maxTokens,
    apiKey: apiKey,
    configuration: {
      baseURL: 'https://api.openai.com/v1',
    },
  };

  console.log('🤖 Initializing LLM:', {
    model: llmConfig.modelName,
    temperature: llmConfig.temperature,
    streaming: llmConfig.streaming,
    apiKey: '✓ Set (' + apiKey.substring(0, 10) + '...)',
    keyLength: apiKey.length,
  });

  return new ChatOpenAI(llmConfig);
}

/**
 * Get a singleton LLM instance (cached)
 * Useful for avoiding multiple initializations
 */
let cachedLLM: ChatOpenAI | null = null;

export function getLLM(): ChatOpenAI {
  if (!cachedLLM) {
    cachedLLM = initializeLLM();
  }
  return cachedLLM;
}

/**
 * Reset the cached LLM instance
 * Useful for testing or when changing configuration
 */
export function resetLLM(): void {
  cachedLLM = null;
}

/**
 * Test the LLM connection with a simple prompt
 * 
 * @returns Promise that resolves with test result
 * 
 * @example
 * ```typescript
 * const result = await testLLM();
 * if (result.success) {
 *   console.log('LLM is working!');
 * }
 * ```
 */
export async function testLLM(): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const llm = getLLM();
    const response = await llm.invoke('Say "Hello from CollabCanvas AI Agent!"');
    
    return {
      success: true,
      response: response.content.toString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cost estimation helper
 * GPT-4o-mini pricing (as of Oct 2024):
 * - Input: $0.15 per 1M tokens
 * - Output: $0.60 per 1M tokens
 * 
 * Typical canvas command:
 * - Input: ~500 tokens (system prompt + context + user message)
 * - Output: ~200 tokens (JSON action + summary)
 * - Cost per command: ~$0.0002 (less than a cent)
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_MILLION = 0.15;
  const OUTPUT_COST_PER_MILLION = 0.60;
  
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + outputCost;
}

