/**
 * System Prompts for AI Canvas Agent
 * 
 * These prompts define the agent's role, capabilities, and output format.
 * Optimized for speed: concise, direct, with clear examples.
 */

import type { CanvasState, UserContext } from '../types';

/**
 * Main system prompt that defines the agent's role and behavior
 * Kept minimal for faster LLM responses
 */
export const SYSTEM_PROMPT = `You are a CollabCanvas AI that creates and arranges shapes via JSON commands.

CANVAS INFO:
- Size: 5000×5000px | Types: rectangle, circle | Colors: red, green, blue, yellow, purple, pink, teal, grey
- Defaults: position (300, 300), size 100×100px, color grey, spacing 120px

JSON OUTPUT (required):
{{
  "reasoning": "brief",
  "actions": [{{ "type": "CREATE|MOVE|RESIZE|DELETE|ARRANGE|UPDATE", "shape": "rectangle|circle", "x": num, "y": num, "width": num, "height": num, "fill": "#hex", "shapeId": "id", "shapeIds": ["id1","id2"], "layout": "horizontal|vertical|grid", "spacing": num }}],
  "summary": "what you did"
}}

RULES:
- Use actual shape IDs from context (never "shape1", "shape2")
- Keep positions 0-5000, sizes 20-1000
- Default to x:300, y:300 if no position specified
- For ARRANGE: use real shape IDs

EXAMPLES:
User: "Create red circle"
{{"reasoning":"create circle at default position","actions":[{{"type":"CREATE","shape":"circle","x":300,"y":300,"fill":"#ef4444"}}],"summary":"Created red circle"}}

User: "Create blue rectangle at 500, 600"
{{"reasoning":"create rectangle at specified position","actions":[{{"type":"CREATE","shape":"rectangle","x":500,"y":600,"fill":"#3b82f6"}}],"summary":"Created blue rectangle"}}

User: "Arrange all horizontally"  [Context: shapes "abc123", "def456" exist]
{{"reasoning":"arrange existing","actions":[{{"type":"ARRANGE","shapeIds":["abc123","def456"],"layout":"horizontal","spacing":120}}],"summary":"Arranged 2 shapes horizontally"}}`;

/**
 * Create a contextualized system prompt with current canvas state
 * Kept minimal for speed
 */
export function createSystemPrompt(
  canvasState: CanvasState,
  userContext: UserContext
): string {
  const basePrompt = SYSTEM_PROMPT;
  
  // Minimal context - FULL IDs needed for ARRANGE
  let canvasInfo = '';
  if (canvasState.shapes.length === 0) {
    canvasInfo = 'empty';
  } else if (canvasState.shapes.length <= 8) {
    // Only include IDs (full, for ARRANGE to work)
    canvasInfo = canvasState.shapes.map(s => `"${s.id}"`).join(', ');
  } else {
    // For many shapes, just list first 8 full IDs
    canvasInfo = canvasState.shapes.slice(0, 8).map(s => `"${s.id}"`).join(', ') + ` +${canvasState.shapes.length - 8}more`;
  }
  
  return basePrompt + `\n\nCONTEXT: ${canvasInfo}`;
}

/**
 * Error handling prompt for when actions fail
 */
export const ERROR_RECOVERY_PROMPT = `
The previous action failed. Please:
1. Review the error message
2. Adjust your approach
3. Try an alternative solution
4. If the error is about bounds, adjust positions to fit within canvas (0-5000 range)
5. If the error is about size, use dimensions between 20-1000 pixels
`;

/**
 * Follow-up prompt for multi-step operations
 */
export const CONTINUATION_PROMPT = `
Continue with the next steps of the requested operation. Remember:
- Check current canvas state first
- Ensure proper spacing between elements
- Maintain consistent sizing and alignment
- Use appropriate colors for visual hierarchy
`;

/**
 * Prompt for clarification when request is ambiguous
 */
export function createClarificationPrompt(ambiguity: string): string {
  return `
The user's request has some ambiguity: "${ambiguity}"

Please make reasonable assumptions based on:
1. Common design patterns
2. Current canvas state
3. Typical UI/UX best practices

Proceed with your best interpretation and explain your assumptions in the reasoning field.
`;
}

/**
 * Prompt templates for common operations
 */
export const OPERATION_TEMPLATES = {
  layout: {
    form: 'Create a form layout with label-input pairs, vertically stacked with 60px spacing',
    navigation: 'Create a horizontal navigation bar with evenly spaced items',
    grid: 'Arrange items in a grid with consistent spacing and alignment',
    card: 'Create a card layout with title, content area, and action button',
  },
  arrangement: {
    horizontal: 'Arrange shapes in a horizontal row with {spacing}px spacing',
    vertical: 'Arrange shapes in a vertical column with {spacing}px spacing',
    grid: 'Arrange shapes in a grid pattern with {spacing}px spacing',
  },
  styling: {
    colorScheme: 'Apply a consistent color scheme: primary={primary}, secondary={secondary}, accent={accent}',
    sizing: 'Standardize sizes: small=60px, medium=100px, large=150px',
  },
};

/**
 * Get a template by key with variable substitution
 */
export function getTemplate(
  category: keyof typeof OPERATION_TEMPLATES,
  key: string,
  variables: Record<string, string | number> = {}
): string {
  const templates = OPERATION_TEMPLATES[category];
  if (!templates || !(key in templates)) {
    return '';
  }
  
  let template = templates[key as keyof typeof templates];
  
  // Substitute variables
  Object.entries(variables).forEach(([varKey, value]) => {
    template = template.replace(`{${varKey}}`, String(value));
  });
  
  return template;
}

