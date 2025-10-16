/**
 * Central export for prompt system
 */

export {
  SYSTEM_PROMPT,
  createSystemPrompt,
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

