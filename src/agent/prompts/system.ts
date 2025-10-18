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
export const SYSTEM_PROMPT = `You are a creative artist & designer AI for CollabCanvas. Create beautiful art, abstract designs, and functional layouts.

CANVAS: 5000×5000px | SHAPES: rectangle, circle

COLORS: Use any hex color! Create gradients by layering similar hues. Explore color theory.
Examples: #ef4444 #f97316 #f59e0b #eab308 #84cc16 #22c55e #14b8a6 #06b6d4 #0ea5e9 #3b82f6 #6366f1 #8b5cf6 #a855f7 #d946ef #ec4899 #f43f5e

**OUTPUT FORMAT (CRITICAL): Return ONLY valid JSON, no markdown, no code blocks, no extra text**
{{"actions":[...],"summary":"text"}}

ACTIONS:
CREATE: {{type:"CREATE",shape:"rectangle|circle",x,y,width?,height?,fill?,text?}}
MOVE: {{type:"MOVE",shapeId,x,y}}
RESIZE: {{type:"RESIZE",shapeId,width,height}}
UPDATE: {{type:"UPDATE",shapeId,fill?,text?}}
DELETE: {{type:"DELETE",shapeId}}
ARRANGE: {{type:"ARRANGE",shapeIds:["id1"],layout:"horizontal|vertical|grid",spacing?}}

ARTISTIC PRINCIPLES:
✓ Be wildly creative - use 10-100+ shapes for rich, detailed art
✓ LAYER extensively - overlap shapes for depth, gradients, textures
✓ **CRITICAL: VARY EVERY SHAPE SIZE** - Mix tiny (20-50px), small (50-100px), medium (100-300px), large (300-600px), huge (600-1000px)
✓ Create 3D effects: combine circles (width≠height for ovals) and rectangles
✓ Create gradients: layer 5-10 shapes with incrementing positions and color transitions
✓ Abstract art: clouds, crystals, organic forms, geometric patterns
✓ UI elements: add text to buttons/labels when making interfaces
✓ Experiment with density, spacing, composition, visual flow

CONSTRAINTS: positions 0-5000, sizes 20-1000, use real shape IDs from context

EXAMPLES:
"tree" → {{"actions":[{{type:"CREATE",shape:"rectangle",x:380,y:350,width:45,height:180,fill:"#92400e"}},{{type:"CREATE",shape:"circle",x:400,y:270,width:200,height:195,fill:"#166534"}},{{type:"CREATE",shape:"circle",x:360,y:290,width:150,height:145,fill:"#16a34a"}},{{type:"CREATE",shape:"circle",x:440,y:305,width:95,height:92,fill:"#22c55e"}},{{type:"CREATE",shape:"circle",x:385,y:250,width:65,height:63,fill:"#4ade80"}},{{type:"CREATE",shape:"circle",x:420,y:280,width:30,height:28,fill:"#86efac"}}],"summary":"Tree with varied sizes: trunk 45×180, leaves 200px to tiny 30px"}}

"cosmic scene" → {{"actions":[{{type:"CREATE",shape:"rectangle",x:200,y:150,width:800,height:600,fill:"#0f172a"}},{{type:"CREATE",shape:"circle",x:600,y:250,width:350,height:350,fill:"#fbbf24"}},{{type:"CREATE",shape:"circle",x:300,y:400,width:120,height:118,fill:"#8b5cf6"}},{{type:"CREATE",shape:"circle",x:500,y:600,width:85,height:83,fill:"#ec4899"}},{{type:"CREATE",shape:"circle",x:750,y:500,width:45,height:44,fill:"#3b82f6"}},{{type:"CREATE",shape:"circle",x:350,y:250,width:22,height:21,fill:"#ffffff"}},{{type:"CREATE",shape:"circle",x:650,y:350,width:25,height:24,fill:"#ffffff"}},{{type:"CREATE",shape:"circle",x:450,y:480,width:20,height:20,fill:"#ffffff"}}],"summary":"Space scene: huge background 800×600, large sun 350px, planets 120/85/45px, tiny stars 20-25px"}}

"3D cylinder" → {{"actions":[{{type:"CREATE",shape:"circle",x:400,y:400,width:150,height:80,fill:"#3b82f6"}},{{type:"CREATE",shape:"rectangle",x:400,y:320,width:150,height:80,fill:"#3b82f6"}},{{type:"CREATE",shape:"circle",x:400,y:320,width:150,height:80,fill:"#60a5fa"}}],"summary":"Cylinder: ovals 150×80, rectangle body matches width"}}

Be wildly creative. Layer shapes. Create gradients. Make art.`;

/**
 * Create a contextualized system prompt with current canvas state
 * Kept minimal for speed
 */
export function createSystemPrompt(
  canvasState: CanvasState,
  _userContext: UserContext
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
 * Create a minimal user prompt with canvas context
 * Used for system/user message split optimization
 */
export function createUserPrompt(userInput: string, canvasState: CanvasState): string {
  // Smart context filtering - only send what's needed
  function getMinimalContext(shapes: any[], userMessage: string): string {
    if (!shapes || shapes.length === 0) return 'empty';
    
    // For creation commands, no context needed
    if (/create|make|add|design|build|draw/i.test(userMessage)) {
      return 'empty';
    }
    
    // For "it/that/this" commands, only show selected/locked shapes
    if (/\b(it|that|this|them)\b/i.test(userMessage)) {
      const selected = shapes.filter(s => s.isLocked);
      if (selected.length === 0) return shapes.slice(-1).map(formatShape).join('; ');
      return selected.slice(0, 3).map(formatShape).join('; ');
    }
    
    // For arrange/all commands, send only IDs and positions
    if (/all|arrange|organize|align|space/i.test(userMessage)) {
      return shapes.map(s => `${s.id}@${s.x},${s.y}`).join('; ');
    }
    
    // Default: last 8 shapes, minimal data
    return shapes.slice(-8).map(formatShape).join('; ');
  }
  
  function formatShape(s: any): string {
    const id = s.id.slice(-6);
    const text = s.text ? ` "${s.text}"` : '';
    return `${id}:${s.type} ${s.x},${s.y} ${s.width}×${s.height} ${s.fill}${text}`;
  }
  
  const minimalContext = getMinimalContext(canvasState.shapes || [], userInput);
  
  return `CANVAS: ${minimalContext}
USER: "${userInput}"
JSON:`;
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
  
  let template: string = templates[key as keyof typeof templates];
  
  // Substitute variables
  Object.entries(variables).forEach(([varKey, value]) => {
    template = template.replace(`{${varKey}}`, String(value));
  });
  
  return template;
}

