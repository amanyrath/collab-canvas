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
    return 'Canvas is empty. Ready to create new shapes.';
  }

  const shapesSummary = state.shapes.length <= 5
    ? state.shapes.map(s => 
        `- ${s.type} "${s.id.slice(-8)}" at (${s.x}, ${s.y}), ${s.width}×${s.height}, ${s.fill}`
      ).join('\n')
    : `${state.shapes.length} shapes on canvas:\n` +
      state.shapes.slice(0, 5).map(s => 
        `- ${s.type} at (${s.x}, ${s.y}), ${s.width}×${s.height}, ${s.fill}`
      ).join('\n') +
      `\n... and ${state.shapes.length - 5} more shapes`;

  // Calculate canvas utilization
  const occupiedArea = state.shapes.reduce((sum, s) => sum + (s.width * s.height), 0);
  const totalArea = state.canvasWidth * state.canvasHeight;
  const utilization = ((occupiedArea / totalArea) * 100).toFixed(1);

  // Find bounding box of all shapes
  const minX = Math.min(...state.shapes.map(s => s.x));
  const maxX = Math.max(...state.shapes.map(s => s.x + s.width));
  const minY = Math.min(...state.shapes.map(s => s.y));
  const maxY = Math.max(...state.shapes.map(s => s.y + s.height));
  
  const contentBounds = `Content bounds: (${minX}, ${minY}) to (${maxX}, ${maxY})`;

  return `Canvas State:
${shapesSummary}

Canvas utilization: ${utilization}%
${contentBounds}
Available space: Consider placing new shapes near (${maxX + 150}, ${minY}) or similar areas`;
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
  const { canvasState, userContext, recentMessages } = context;
  
  const parts = [
    `User: ${userContext.displayName} (ID: ${userContext.userId})`,
    '',
    formatCanvasState(canvasState),
    '',
  ];

  // Add spatial suggestions if useful
  const spatialSuggestions = analyzeSpatialOpportunities(canvasState);
  if (spatialSuggestions.length > 0) {
    parts.push('Spatial Suggestions:');
    spatialSuggestions.forEach(s => {
      parts.push(`- ${s.description}${s.coordinates ? ` at (${s.coordinates.x}, ${s.coordinates.y})` : ''}`);
    });
    parts.push('');
  }

  // Add design recommendations if applicable
  const recommendations = getDesignRecommendations(canvasState);
  if (recommendations.length > 0) {
    parts.push('Design Recommendations:');
    recommendations.forEach(r => {
      parts.push(`- [${r.priority}] ${r.suggestion}`);
    });
    parts.push('');
  }

  // Add conversation history if exists
  if (recentMessages.length > 0) {
    parts.push('Recent Conversation:');
    parts.push(formatConversationHistory(recentMessages));
    parts.push('');
  }

  return parts.join('\n');
}

