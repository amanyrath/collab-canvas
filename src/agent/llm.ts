/**
 * LLM Initialization Module for AI Canvas Agent
 * 
 * This module configures and exports the LangChain ChatOpenAI instance
 * for use by the agent executor.
 */

import { ChatOpenAI } from '@langchain/openai';
import type { AgentConfig } from './types';
import { getOpenAIKey, isAgentEnvironmentSecure } from '../utils/keyManager';

/**
 * Default configuration for the LLM
 * Optimized for speed while maintaining quality
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',     // Fastest GPT-4 variant
  temperature: 0.1,          // Very low for fast, deterministic outputs
  streaming: true,           // Enable streaming for better UX
  maxTokens: 2000,           // Support large multi-shape commands (grids, complex layouts)
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
  // Check if we're in a secure environment for agent features
  if (!isAgentEnvironmentSecure() && !config.openaiApiKey) {
    throw new Error(
      'Agent features require a backend API in production. ' +
      'See SECURITY.md for implementation details.'
    );
  }

  const apiKey = config.openaiApiKey || getOpenAIKey();

  console.log('🔑 Environment check:', {
    hasConfigKey: !!config.openaiApiKey,
    isSecureEnv: isAgentEnvironmentSecure(),
    isDev: import.meta.env.DEV,
  });

  if (!apiKey) {
    throw new Error(
      'OpenAI API key not found. ' +
      (import.meta.env.DEV 
        ? 'Please set VITE_OPENAI_API_KEY in your .env file. See SETUP.md for instructions.'
        : 'Agent features require a backend API. See SECURITY.md for details.')
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
 * Cost estimation helper with prompt caching
 * GPT-4o-mini pricing (as of Oct 2024):
 * - Input: $0.15 per 1M tokens
 * - Cached input: $0.075 per 1M tokens (50% discount)
 * - Output: $0.60 per 1M tokens
 * 
 * Typical canvas command WITHOUT caching:
 * - Input: ~2500 tokens (system prompt + context + user message)
 * - Output: ~200 tokens (JSON action + summary)
 * - Cost per command: ~$0.0005
 * 
 * WITH prompt caching (after first request):
 * - Static prompt: ~2000 tokens (CACHED - 50% discount)
 * - Dynamic context: ~500 tokens (NOT cached)
 * - Output: ~200 tokens
 * - Cost per command: ~$0.0003 (40% cheaper)
 * 
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cachedTokens - Number of cached input tokens (default 0)
 */
export function estimateCost(
  inputTokens: number, 
  outputTokens: number, 
  cachedTokens: number = 0
): number {
  const INPUT_COST_PER_MILLION = 0.15;
  const CACHED_INPUT_COST_PER_MILLION = 0.075; // 50% discount
  const OUTPUT_COST_PER_MILLION = 0.60;
  
  const uncachedTokens = Math.max(0, inputTokens - cachedTokens);
  
  const inputCost = (uncachedTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + cachedCost + outputCost;
}

