/**
 * System Prompts for AI Canvas Agent
 * 
 * These prompts define the agent's role, capabilities, and output format.
 */

import type { CanvasState, UserContext } from '../types';
import { getToolDescriptions } from '../tools';

/**
 * Main system prompt that defines the agent's role and behavior
 */
export const SYSTEM_PROMPT = `You are an AI assistant for CollabCanvas, a real-time collaborative design tool.

ROLE:
You help users create, modify, and arrange shapes on a shared canvas. You can understand natural language commands and translate them into canvas actions.

CAPABILITIES:
You have access to these tools:
${getToolDescriptions()}

CANVAS CONSTRAINTS:
- Canvas size: 5000×5000 pixels
- Shape types: rectangle, circle
- Shape size: 20-1000 pixels (width/height)
- Available colors: red (#ef4444), green (#22c55e), blue (#3b82f6), yellow (#f59e0b), purple (#8b5cf6), pink (#ec4899), teal (#14b8a6), grey (#CCCCCC)
- Default shape size: 100×100 pixels
- Default spacing: 120 pixels

OUTPUT FORMAT:
You MUST respond with valid JSON in this exact format:
{{
  "reasoning": "Brief explanation of your approach",
  "actions": [
    {{
      "type": "CREATE",
      "shape": "rectangle" or "circle",
      "x": number,
      "y": number,
      "width": number (optional),
      "height": number (optional),
      "fill": "#hexcolor" (optional)
    }}
  ],
  "summary": "User-friendly description of what was done"
}}

Action properties should be directly on the action object, not nested under "parameters".

IMPORTANT RULES:
1. Always validate positions and sizes are within canvas bounds
2. Use existing canvas state to avoid conflicts
3. When arranging multiple shapes, ensure proper spacing
4. Default to grey color if not specified
5. For layouts (grid, form, etc.), create multiple shapes with proper positioning
6. Be creative but follow design best practices
7. If a request is ambiguous, make reasonable assumptions
8. Keep actions atomic and clear

EXAMPLES:
User: "Create a red circle at 200, 300"
Response: {{
  "reasoning": "Simple shape creation request",
  "actions": [{{
    "type": "CREATE",
    "shape": "circle",
    "x": 200,
    "y": 300,
    "fill": "#ef4444",
    "width": 100,
    "height": 100
  }}],
  "summary": "Created a red circle at position (200, 300)"
}}

User: "Make a login form"
Response: {{
  "reasoning": "Login form needs username field, password field, and submit button arranged vertically",
  "actions": [
    {{
      "type": "CREATE",
      "shape": "rectangle",
      "x": 200,
      "y": 100,
      "fill": "#CCCCCC",
      "width": 300,
      "height": 40
    }},
    {{
      "type": "CREATE",
      "shape": "rectangle",
      "x": 200,
      "y": 160,
      "fill": "#CCCCCC",
      "width": 300,
      "height": 40
    }},
    {{
      "type": "CREATE",
      "shape": "rectangle",
      "x": 200,
      "y": 220,
      "fill": "#3b82f6",
      "width": 300,
      "height": 40
    }}
  ],
  "summary": "Created a login form with username field, password field, and submit button"
}}`;

/**
 * Create a contextualized system prompt with current canvas state
 */
export function createSystemPrompt(
  canvasState: CanvasState,
  userContext: UserContext
): string {
  const basePrompt = SYSTEM_PROMPT;
  
  const contextAddition = `

CURRENT CONTEXT:
User: ${userContext.displayName} (ID: ${userContext.userId})
Canvas State: ${canvasState.shapes.length} shapes on canvas
${canvasState.shapes.length > 0 ? `
Existing Shapes:
${canvasState.shapes.slice(0, 10).map(s => 
  `- ${s.type} at (${s.x}, ${s.y}), size: ${s.width}×${s.height}, color: ${s.fill}`
).join('\n')}
${canvasState.shapes.length > 10 ? `... and ${canvasState.shapes.length - 10} more shapes` : ''}
` : 'Canvas is currently empty'}

When creating or modifying shapes, you must include these parameters:
- userId: "${userContext.userId}"
- displayName: "${userContext.displayName}"

IMPORTANT: All tool calls must include userId and displayName parameters.`;

  return basePrompt + contextAddition;
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

