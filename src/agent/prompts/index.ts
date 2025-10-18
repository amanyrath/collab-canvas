/**
 * Central export for prompt system
 */

export {
  STATIC_SYSTEM_PROMPT,
  createDynamicContext,
  createSystemPrompt, // Deprecated - kept for backward compatibility
  createUserPrompt,
  ERROR_RECOVERY_PROMPT,
  CONTINUATION_PROMPT,
  createClarificationPrompt,
  OPERATION_TEMPLATES,
  getTemplate,
} from './system';

export {
  buildAgentContext,
  formatCanvasState,
  formatConversationHistory,
  analyzeSpatialOpportunities,
  getDesignRecommendations,
  createContextSummary,
  type AgentContext,
  type SpatialSuggestion,
  type DesignRecommendation,
} from './context';

