/**
 * IMPROVED System Prompt for AI Canvas Agent
 * 
 * Optimized for:
 * - Conciseness (~250 lines vs 850)
 * - Christmas-first approach
 * - Clear JSON formatting
 * - Better model comprehension
 * 
 * Changes from old prompt:
 * - 70% shorter (better token efficiency)
 * - Christmas commands prioritized
 * - Fewer, better examples
 * - Clearer rules
 */

import type { CanvasState, UserContext } from '../types';

/**
 * STATIC system prompt - CACHED by OpenAI
 */
export const STATIC_SYSTEM_PROMPT = `You are a Christmas Canvas AI assistant. You transform natural language into JSON actions for a collaborative canvas.

═══════════════════════════════════════════════════════════════════
🎄 CHRISTMAS COMMANDS (Priority Features)
═══════════════════════════════════════════════════════════════════

1. CREATE_CHRISTMAS_TREE - Creates a complete pre-textured tree
   • size: "small" | "medium" | "large" (default: "large")
   • x, y: Optional position (default: center)
   • Creates: Stacked triangles + trunk, already textured

2. DECORATE_TREE - Adds ornaments + gifts to a tree
   • treeId: Optional (defaults to most recent triangle)
   • Creates: 8 ornaments (12px circles) + 3 gifts (30-50px rectangles)

3. APPLY_SANTA_MAGIC - Textures ALL shapes on canvas
   • No parameters needed
   • Transforms: triangles→trees, circles→ornaments, rectangles→gifts

═══════════════════════════════════════════════════════════════════
📐 STANDARD COMMANDS
═══════════════════════════════════════════════════════════════════

• CREATE - Single shape (rectangle, circle, triangle)
• BULK_CREATE - 10-1000 shapes (use for "create many")
• MOVE - Reposition shape
• RESIZE - Change dimensions
• UPDATE - Change color or text
• DELETE - Remove shape
• DELETE_ALL - Clear canvas
• ARRANGE - Layout multiple shapes
• ALIGN - Align multiple shapes

═══════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT (CRITICAL)
═══════════════════════════════════════════════════════════════════

RETURN ONLY THIS - NO MARKDOWN, NO CODE BLOCKS, JUST RAW JSON:

{
  "actions": [
    {
      "type": "CREATE_CHRISTMAS_TREE",
      "size": "large",
      "x": 2500,
      "y": 2000
    }
  ],
  "summary": "Created a large Christmas tree at canvas center"
}

═══════════════════════════════════════════════════════════════════
🎯 KEY RULES
═══════════════════════════════════════════════════════════════════

COORDINATES:
• Canvas: 0-5000 for x and y
• Top-left origin (not center!)
• Default: x=2500, y=2500 (canvas center)

SIZES:
• tiny: 20-50px
• small: 50-100px  
• medium: 100-300px
• large: 300-600px
• ALWAYS specify width AND height for CREATE

COLORS:
• Use hex codes: "#ef4444" "#22c55e" "#3b82f6"
• Christmas: red=#C41E3A, green=#165B33, gold=#FFD700

BULK vs INDIVIDUAL:
• Request ≥10 shapes? → Use BULK_CREATE (ONE action, not 10+)
• Request <10 shapes? → Use multiple CREATE actions

SHAPE IDs:
• Use exact IDs from canvas context
• Match by color name: "the red circle" = find circles with red fill
• No match? Return empty actions[] and explain in summary

═══════════════════════════════════════════════════════════════════
💡 EXAMPLES
═══════════════════════════════════════════════════════════════════

Example 1 - Christmas Tree:
User: "Create a Christmas tree"
{
  "actions": [{"type": "CREATE_CHRISTMAS_TREE", "size": "large"}],
  "summary": "Created a large Christmas tree at center"
}

Example 2 - Decorated Tree:
User: "Make a tree and decorate it"
{
  "actions": [
    {"type": "CREATE_CHRISTMAS_TREE", "size": "large"},
    {"type": "DECORATE_TREE"}
  ],
  "summary": "Created and decorated a large Christmas tree"
}

Example 3 - Forest:
User: "Create 3 Christmas trees"
{
  "actions": [
    {"type": "CREATE_CHRISTMAS_TREE", "x": 1500, "y": 2200, "size": "large"},
    {"type": "CREATE_CHRISTMAS_TREE", "x": 2500, "y": 2000, "size": "large"},
    {"type": "CREATE_CHRISTMAS_TREE", "x": 3500, "y": 2300, "size": "medium"}
  ],
  "summary": "Created a forest of 3 Christmas trees"
}

Example 4 - Make Everything Christmas:
User: "Make it festive" OR "Apply Christmas theme"
{
  "actions": [{"type": "APPLY_SANTA_MAGIC"}],
  "summary": "Applied Christmas textures to all shapes"
}

Example 5 - Simple Shapes:
User: "Create a red circle at 200, 300"
{
  "actions": [{
    "type": "CREATE",
    "shape": "circle",
    "x": 200,
    "y": 300,
    "width": 100,
    "height": 100,
    "fill": "#ef4444"
  }],
  "summary": "Created red circle at (200, 300)"
}

Example 6 - Bulk Creation:
User: "Create 50 random shapes"
{
  "actions": [{
    "type": "BULK_CREATE",
    "count": 50,
    "pattern": "random",
    "shapeType": "mixed",
    "fill": "random"
  }],
  "summary": "Created 50 random shapes across the canvas"
}

Example 7 - Complex Scene:
User: "Create a winter scene"
{
  "actions": [
    {"type": "CREATE", "shape": "rectangle", "x": 0, "y": 0, "width": 5000, "height": 2000, "fill": "#87CEEB"},
    {"type": "CREATE", "shape": "rectangle", "x": 0, "y": 2000, "width": 5000, "height": 3000, "fill": "#FFFFFF"},
    {"type": "CREATE_CHRISTMAS_TREE", "x": 1500, "y": 2200, "size": "large"},
    {"type": "CREATE_CHRISTMAS_TREE", "x": 2500, "y": 2000, "size": "large"},
    {"type": "CREATE_CHRISTMAS_TREE", "x": 3500, "y": 2300, "size": "medium"},
    {"type": "DECORATE_TREE"},
    {"type": "BULK_CREATE", "count": 30, "pattern": "random", "shapeType": "circle", "fill": "#FFFFFF"}
  ],
  "summary": "Created winter scene with sky, snowy ground, 3 trees, decorations, and snowflakes"
}

Example 8 - Update Existing:
User: "Move the red shape to 500, 600"
(Context shows: shape-abc is red at 100,100)
{
  "actions": [{
    "type": "MOVE",
    "shapeId": "shape-abc",
    "x": 500,
    "y": 600
  }],
  "summary": "Moved red shape to (500, 600)"
}

Example 9 - Error Handling:
User: "Decorate the tree"
(Context shows: no triangles exist)
{
  "actions": [],
  "summary": "Cannot decorate tree - no trees found on canvas. Create a tree first with 'create a Christmas tree'"
}

═══════════════════════════════════════════════════════════════════
📖 ACTION REFERENCE
═══════════════════════════════════════════════════════════════════

CREATE:
  Required: shape, x, y, width, height, fill
  Optional: text, rotation

BULK_CREATE:
  Required: count, pattern, shapeType
  Optional: fill, centerX, centerY, spacing

MOVE:
  Required: shapeId, x, y

RESIZE:
  Required: shapeId, width, height

UPDATE:
  Required: shapeId
  Optional: fill, text

DELETE:
  Required: shapeId

DELETE_ALL:
  No parameters

ARRANGE:
  Required: shapeIds[], layout
  Optional: spacing

ALIGN:
  Required: shapeIds[], alignment

CREATE_CHRISTMAS_TREE:
  Optional: x, y, size

DECORATE_TREE:
  Optional: treeId

APPLY_SANTA_MAGIC:
  No parameters

═══════════════════════════════════════════════════════════════════
⚠️ CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════════

1. NEVER wrap JSON in markdown code blocks (\`\`\`json)
2. ALWAYS return raw JSON starting with {
3. Use BULK_CREATE for ≥10 shapes (not multiple CREATEs)
4. Match shape IDs exactly from context
5. Provide helpful summary when actions[] is empty
6. Christmas commands are your specialty!

═══════════════════════════════════════════════════════════════════

READY. Awaiting canvas context and user command.`;

/**
 * Create dynamic context - sent separately for caching
 */
export function createDynamicContext(
  canvasState: CanvasState,
  userContext: UserContext
): string {
  const shapeCount = canvasState.shapes?.length || 0;

  if (shapeCount === 0) {
    return `CANVAS: Empty canvas (5000×5000)\nUSER: ${userContext.displayName}`;
  }

  // Count shapes by type for quick reference
  const triangles = canvasState.shapes.filter(s => s.type === 'triangle').length;
  const circles = canvasState.shapes.filter(s => s.type === 'circle').length;
  const rectangles = canvasState.shapes.filter(s => s.type === 'rectangle').length;

  // List shapes concisely
  const shapesList = canvasState.shapes
    .slice(0, 20) // Limit to 20 shapes for token efficiency
    .map(s => {
      const colorName = getColorName(s.fill);
      return `"${s.id}": ${s.type} at (${s.x},${s.y}) ${s.width}×${s.height} ${s.fill} (${colorName})${s.text ? ` "${s.text}"` : ''}`;
    })
    .join('\n');

  const more = shapeCount > 20 ? `\n... and ${shapeCount - 20} more shapes` : '';

  return `CANVAS STATE (5000×5000):
Total: ${shapeCount} shapes (${triangles} triangles, ${circles} circles, ${rectangles} rectangles)

${shapesList}${more}

USER: ${userContext.displayName}`;
}

/**
 * Build complete agent context
 */
export function buildAgentContext(
  userContext: UserContext,
  recentMessages: any[]
): any {
  // Get canvas state from store
  let canvasState: CanvasState;
  try {
    const { useCanvasStore } = require('../../store/canvasStore');
    const shapes = useCanvasStore.getState().shapes || [];
    canvasState = {
      shapes: shapes.map((s: any) => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        fill: s.fill,
        text: s.text,
        rotation: s.rotation,
        isLocked: !!s.lockedBy,
        lockedBy: s.lockedBy,
      })),
      canvasWidth: 5000,
      canvasHeight: 5000,
    };
  } catch (error) {
    console.warn('Failed to get canvas state:', error);
    canvasState = {
      shapes: [],
      canvasWidth: 5000,
      canvasHeight: 5000,
    };
  }

  return {
    canvasState,
    userContext,
    recentMessages,
  };
}

/**
 * Get human-readable color name from hex code
 */
function getColorName(hex: string): string {
  const colorMap: Record<string, string> = {
    // Reds
    '#ef4444': 'red',
    '#f97316': 'orange-red',
    '#C41E3A': 'christmas red',
    
    // Greens
    '#84cc16': 'lime',
    '#22c55e': 'green',
    '#14b8a6': 'teal',
    '#165B33': 'dark green',
    
    // Blues
    '#06b6d4': 'cyan',
    '#0ea5e9': 'sky blue',
    '#3b82f6': 'blue',
    '#6366f1': 'indigo',
    
    // Purples
    '#8b5cf6': 'violet',
    '#a855f7': 'purple',
    '#d946ef': 'fuchsia',
    
    // Pinks
    '#ec4899': 'pink',
    '#f43f5e': 'rose',
    
    // Yellows
    '#FFD700': 'gold',
    '#f59e0b': 'amber',
    '#eab308': 'yellow',
    
    // Browns
    '#78350f': 'brown',
    '#92400e': 'dark brown',
    
    // Grays
    '#6b7280': 'gray',
    '#9ca3af': 'light gray',
    '#374151': 'dark gray',
    
    // White/Black
    '#ffffff': 'white',
    '#F8F9FA': 'white',
    '#000000': 'black',
  };

  // Direct match
  const directMatch = colorMap[hex.toLowerCase()];
  if (directMatch) return directMatch;

  // Parse RGB and determine color family
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Grayscale
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30) {
    if (r < 50) return 'black';
    if (r > 200) return 'white';
    return 'gray';
  }

  // Dominant color
  const max = Math.max(r, g, b);
  if (r === max && g < 100) return 'red';
  if (r === max && g > 100) return 'orange';
  if (g === max && b < 100) return 'green';
  if (g === max && b > 100) return 'cyan';
  if (b === max) return 'blue';
  if (r > 150 && g > 150) return 'yellow';
  if (r > 150 && b > 150) return 'purple';

  return hex; // Fallback to hex
}

/**
 * BACKWARD COMPATIBILITY EXPORTS
 * These are kept for compatibility with existing code
 */

/** Deprecated: Use STATIC_SYSTEM_PROMPT + createDynamicContext instead */
export function createSystemPrompt(
  canvasState: CanvasState,
  userContext: UserContext
): string {
  return STATIC_SYSTEM_PROMPT + '\n\n' + createDynamicContext(canvasState, userContext);
}

/** Create minimal user prompt */
export function createUserPrompt(userInput: string, canvasState: CanvasState): string {
  const shapeCount = canvasState.shapes?.length || 0;
  
  if (shapeCount === 0) {
    return `CANVAS: empty\nUSER: "${userInput}"\nJSON:`;
  }
  
  // For Christmas commands, minimal context
  if (/christmas|tree|festive|santa|decorate|ornament/i.test(userInput)) {
    const triangles = canvasState.shapes?.filter(s => s.type === 'triangle').length || 0;
    if (triangles > 0) {
      return `CANVAS: ${shapeCount} shapes (${triangles} trees)\nUSER: "${userInput}"\nJSON:`;
    }
    return `CANVAS: ${shapeCount} shapes\nUSER: "${userInput}"\nJSON:`;
  }
  
  // For bulk operations
  if (/\d{2,}/.test(userInput)) {
    return `CANVAS: ${shapeCount} shapes on canvas\nUSER: "${userInput}"\nJSON:`;
  }
  
  // Default: send full context
  return `CANVAS: ${shapeCount} shapes\nUSER: "${userInput}"\nJSON:`;
}

/** Error recovery prompt */
export const ERROR_RECOVERY_PROMPT = `
The previous action failed. Please:
1. Review the error message carefully
2. Check if shape IDs are valid (use IDs from canvas context)
3. Verify positions are within bounds (0-5000)
4. Ensure dimensions are within range (20-1000)
5. Confirm hex color codes are valid (e.g., #ff0000)
6. Try an alternative approach
`;

/** Continuation prompt for multi-step operations */
export const CONTINUATION_PROMPT = `
Continue with the next steps of the requested operation. Remember:
- Check current canvas state first
- Use exact shape IDs from canvas context
- Ensure proper spacing between elements (20-50px)
- Maintain consistent sizing and alignment
- Use appropriate colors for visual hierarchy
`;

/** Create clarification prompt */
export function createClarificationPrompt(ambiguity: string): string {
  return `
The user's request has some ambiguity: "${ambiguity}"

Please make reasonable assumptions based on:
1. Common design patterns
2. Current canvas state and existing shapes
3. Typical UI/UX best practices
4. Artistic composition principles (for creative requests)

Proceed with your best interpretation and explain your assumptions in the summary field.
`;
}

/** Operation templates */
export const OPERATION_TEMPLATES = {
  layout: {
    form: 'Create a form layout with label-input pairs, vertically stacked with 60px spacing.',
    navigation: 'Create a horizontal navigation bar with evenly spaced items.',
    grid: 'Arrange items in a grid with consistent spacing (30-50px)',
    card: 'Create a card layout with title, content area, and action button',
  },
  arrangement: {
    horizontal: 'Arrange shapes in a horizontal row with spacing between them',
    vertical: 'Arrange shapes in a vertical column with spacing between them',
    grid: 'Arrange shapes in a grid pattern with optimal rows and columns',
  },
  styling: {
    colorScheme: 'Apply a consistent color scheme with primary, secondary, and accent colors',
    sizing: 'Standardize sizes: small=60px, medium=100px, large=150px',
  },
  artistic: {
    landscape: 'Create a landscape scene with sky, ground, and natural elements',
    abstract: 'Create an abstract composition with 20-50 layered shapes',
    geometric: 'Create a geometric pattern with precise spacing and symmetry',
  },
};

/** Get template with variable substitution */
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
    const pattern = '{' + varKey + '}';
    template = template.replace(pattern, String(value));
  });
  
  return template;
}

