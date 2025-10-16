/**
 * Context Builders for AI Canvas Agent
 * 
 * These functions build rich context from canvas state and user data
 * to help the LLM make better decisions.
 */

import type { CanvasState, UserContext, AgentMessage } from '../types';
import { getCanvasState } from '../tools/canvas';

/**
 * Build full context for agent prompt
 */
export interface AgentContext {
  canvasState: CanvasState;
  userContext: UserContext;
  recentMessages: AgentMessage[];
  timestamp: Date;
}

/**
 * Create agent context from current state
 */
export function buildAgentContext(
  userContext: UserContext,
  recentMessages: AgentMessage[] = []
): AgentContext {
  const canvasState = getCanvasState();
  
  return {
    canvasState,
    userContext,
    recentMessages: recentMessages.slice(-5), // Keep last 5 messages for context
    timestamp: new Date(),
  };
}

/**
 * Format canvas state for prompt context
 */
export function formatCanvasState(state: CanvasState): string {
  if (state.shapes.length === 0) {
    return 'Canvas is empty.';
  }

  // Always include IDs for arrangement operations
  if (state.shapes.length <= 10) {
    // For 10 or fewer shapes, show detailed info
    const shapesSummary = state.shapes
      .map(s => `${s.type} "${s.id}" at (${s.x}, ${s.y})`)
      .join(', ');
    return `Canvas: ${shapesSummary}`;
  } else {
    // For many shapes, just list IDs
    const ids = state.shapes.map(s => `"${s.id}"`).slice(0, 20).join(', ');
    const more = state.shapes.length > 20 ? ` and ${state.shapes.length - 20} more` : '';
    return `Canvas has ${state.shapes.length} shapes with IDs: ${ids}${more}`;
  }
}

/**
 * Format conversation history for context
 */
export function formatConversationHistory(messages: AgentMessage[]): string {
  if (messages.length === 0) {
    return 'This is the start of the conversation.';
  }

  return messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}

/**
 * Analyze canvas to provide spatial suggestions
 */
export interface SpatialSuggestion {
  type: 'empty_area' | 'grouping' | 'alignment';
  description: string;
  coordinates?: { x: number; y: number };
}

export function analyzeSpatialOpportunities(state: CanvasState): SpatialSuggestion[] {
  const suggestions: SpatialSuggestion[] = [];

  if (state.shapes.length === 0) {
    suggestions.push({
      type: 'empty_area',
      description: 'Canvas is empty, good starting position',
      coordinates: { x: 200, y: 200 },
    });
    return suggestions;
  }

  // Find empty quadrants
  const quadrants = [
    { name: 'top-left', x: 0, y: 0, width: 2500, height: 2500 },
    { name: 'top-right', x: 2500, y: 0, width: 2500, height: 2500 },
    { name: 'bottom-left', x: 0, y: 2500, width: 2500, height: 2500 },
    { name: 'bottom-right', x: 2500, y: 2500, width: 2500, height: 2500 },
  ];

  quadrants.forEach(quad => {
    const shapesInQuadrant = state.shapes.filter(s =>
      s.x >= quad.x && s.x < quad.x + quad.width &&
      s.y >= quad.y && s.y < quad.y + quad.height
    );

    if (shapesInQuadrant.length === 0) {
      suggestions.push({
        type: 'empty_area',
        description: `${quad.name} quadrant is empty`,
        coordinates: { x: quad.x + 200, y: quad.y + 200 },
      });
    }
  });

  // Check for potential grouping opportunities
  if (state.shapes.length >= 3) {
    // Find shapes that are close together but not aligned
    const clusters = findClusters(state.shapes);
    if (clusters.some(c => c.length >= 3)) {
      suggestions.push({
        type: 'grouping',
        description: 'Multiple nearby shapes could be better aligned',
      });
    }
  }

  return suggestions;
}

/**
 * Simple clustering algorithm to find nearby shapes
 */
function findClusters(
  shapes: CanvasState['shapes'],
  threshold: number = 200
): Array<CanvasState['shapes']> {
  const clusters: Array<CanvasState['shapes']> = [];
  const visited = new Set<string>();

  shapes.forEach(shape => {
    if (visited.has(shape.id)) return;

    const cluster = [shape];
    visited.add(shape.id);

    shapes.forEach(other => {
      if (visited.has(other.id)) return;

      const distance = Math.sqrt(
        Math.pow(shape.x - other.x, 2) + Math.pow(shape.y - other.y, 2)
      );

      if (distance < threshold) {
        cluster.push(other);
        visited.add(other.id);
      }
    });

    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  });

  return clusters;
}

/**
 * Get design recommendations based on current canvas
 */
export interface DesignRecommendation {
  category: 'color' | 'spacing' | 'alignment' | 'sizing';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export function getDesignRecommendations(state: CanvasState): DesignRecommendation[] {
  const recommendations: DesignRecommendation[] = [];

  if (state.shapes.length === 0) {
    return recommendations;
  }

  // Check color variety
  const uniqueColors = new Set(state.shapes.map(s => s.fill));
  if (uniqueColors.size > 5) {
    recommendations.push({
      category: 'color',
      suggestion: 'Consider limiting to 3-4 colors for better visual cohesion',
      priority: 'medium',
    });
  }

  // Check for alignment opportunities
  const xPositions = state.shapes.map(s => s.x);
  const yPositions = state.shapes.map(s => s.y);
  
  const hasAlignmentOpportunity = 
    new Set(xPositions.map(x => Math.round(x / 50))).size < xPositions.length * 0.7 ||
    new Set(yPositions.map(y => Math.round(y / 50))).size < yPositions.length * 0.7;

  if (hasAlignmentOpportunity && state.shapes.length >= 4) {
    recommendations.push({
      category: 'alignment',
      suggestion: 'Some shapes are nearly aligned - consider precise alignment',
      priority: 'low',
    });
  }

  // Check sizing consistency
  const sizes = state.shapes.map(s => `${s.width}×${s.height}`);
  const uniqueSizes = new Set(sizes);
  if (uniqueSizes.size === state.shapes.length && state.shapes.length > 5) {
    recommendations.push({
      category: 'sizing',
      suggestion: 'Consider standardizing shape sizes for visual consistency',
      priority: 'low',
    });
  }

  return recommendations;
}

/**
 * Create a comprehensive context summary for the agent
 */
export function createContextSummary(context: AgentContext): string {
  const { canvasState, userContext } = context;
  
  // Keep it minimal for faster LLM responses
  return `User: ${userContext.displayName}
${formatCanvasState(canvasState)}`;
}

