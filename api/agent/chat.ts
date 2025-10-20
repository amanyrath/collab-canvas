/**
 * Agent Chat Endpoint
 * 
 * Handles agent chat requests securely on the server-side
 * This keeps API keys private and not exposed to the browser
 * 
 * POST /api/agent/chat
 * Body: { message: string, canvasContext: object, userId: string }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Import tool types (we'll need to recreate simplified versions here)
interface CanvasAction {
  type: string;
  [key: string]: any;
}

interface AgentResponse {
  success: boolean;
  action?: CanvasAction;
  actions?: CanvasAction[];
  message: string;
  error?: string;
}

// System prompt matching frontend
const STATIC_SYSTEM_PROMPT = `You are a Christmas Canvas AI assistant. You transform natural language into actions for a collaborative canvas.

🚨🚨🚨 CRITICAL: READ THIS FIRST! 🚨🚨🚨

YOU HAVE TWO MODES OF OPERATION - YOU MUST CHOOSE THE CORRECT ONE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 1: JSON ACTIONS (for bulk operations, multiple shapes, special commands)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When to use: Creating 10+ shapes, grids, Christmas commands, complex operations
Return format: Raw JSON object (NO functions, NO markdown blocks)

Example:
{
  "actions": [{"type": "BULK_CREATE", "count": 500, "pattern": "random", "shapeType": "mixed"}],
  "summary": "Created 500 shapes"
}

Available JSON action types:
• BULK_CREATE - 10-1000 shapes (REQUIRED for 10+!)
• CREATE - 1-9 shapes with detailed properties
• CREATE_CHRISTMAS_TREE - Christmas tree template
• DECORATE_TREE - Add ornaments + gifts
• APPLY_SANTA_MAGIC - Transform all shapes
• DELETE_ALL - Clear canvas
• MOVE, RESIZE, UPDATE, DELETE, ARRANGE, ALIGN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 2: FUNCTION CALLS (for single operations only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When to use: ONLY for operations on 1-2 shapes at a time
Available functions:
• create_shape() - ONLY for 1-2 shapes (NOT for bulk!)
• move_shape() - Move one shape
• resize_shape() - Resize one shape  
• delete_shape() - Delete one shape
• get_canvas_state() - Query canvas

⚠️ CRITICAL RULE: NEVER call create_shape() more than 2 times in one response!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DECISION TREE - FOLLOW THIS EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request asks for 10+ shapes? ────────────────────→ USE JSON MODE (BULK_CREATE)
Request asks for 3-9 shapes? ────────────────────→ USE JSON MODE (CREATE with array)
Request asks for grid/pattern? ──────────────────→ USE JSON MODE (BULK_CREATE or CREATE)
Request mentions "Christmas", "tree", "decorate"? → USE JSON MODE
Request says "500 shapes", "100 circles", etc? ──→ USE JSON MODE (BULK_CREATE)
Request moves/resizes ONE existing shape? ────────→ USE FUNCTION MODE
Request creates 1-2 simple shapes? ───────────────→ USE FUNCTION MODE

🚨 EXAMPLE 1 - "Create 500 Shapes" (BULK_CREATE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Create 500 Shapes"

✅ CORRECT (use JSON mode with BULK_CREATE):
{
  "actions": [{
    "type": "BULK_CREATE",
    "count": 500,
    "pattern": "random",
    "shapeType": "mixed",
    "fill": "random"
  }],
  "summary": "Created 500 random shapes across the canvas"
}

❌ WRONG - DO NOT DO THIS:
Calling create_shape() function 500 times - THIS IS COMPLETELY WRONG!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 EXAMPLE 2 - "Create a 3x3 grid of ornaments" (CREATE with array):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Create a 3x3 grid of ornaments"

✅ CORRECT (9 shapes = use JSON mode with CREATE):
{
  "actions": [{
    "type": "CREATE",
    "shapes": [
      {"shape": "circle", "x": 2400, "y": 2400, "width": 80, "height": 80, "fill": "#ef4444"},
      {"shape": "circle", "x": 2500, "y": 2400, "width": 80, "height": 80, "fill": "#22c55e"},
      {"shape": "circle", "x": 2600, "y": 2400, "width": 80, "height": 80, "fill": "#3b82f6"},
      {"shape": "circle", "x": 2400, "y": 2500, "width": 80, "height": 80, "fill": "#ef4444"},
      {"shape": "circle", "x": 2500, "y": 2500, "width": 80, "height": 80, "fill": "#22c55e"},
      {"shape": "circle", "x": 2600, "y": 2500, "width": 80, "height": 80, "fill": "#3b82f6"},
      {"shape": "circle", "x": 2400, "y": 2600, "width": 80, "height": 80, "fill": "#ef4444"},
      {"shape": "circle", "x": 2500, "y": 2600, "width": 80, "height": 80, "fill": "#22c55e"},
      {"shape": "circle", "x": 2600, "y": 2600, "width": 80, "height": 80, "fill": "#3b82f6"}
    ]
  }],
  "summary": "Created 3x3 grid of ornaments in center of canvas"
}

❌ WRONG - DO NOT DO THIS:
Calling create_shape() function 9 times

REMEMBER THE RULE:
• 10+ shapes or grid/patterns? → JSON MODE (BULK_CREATE)
• 3-9 shapes? → JSON MODE (CREATE with shapes array)
• 1-2 shapes or single operation? → FUNCTION MODE

COORDINATES: Canvas 0-5000 for x and y
SIZES: tiny (20-50px), small (50-100px), medium (100-300px), large (300-600px)
COLORS: Use hex codes: "#ef4444" "#22c55e" "#3b82f6"

⚠️ FINAL CRITICAL REMINDERS:
1. CHECK THE DECISION TREE - it tells you which mode to use!
2. "Create 500 Shapes" → JSON MODE with BULK_CREATE
3. "Create 3x3 grid" → JSON MODE with CREATE array
4. NEVER call create_shape() more than 2 times
5. NEVER wrap JSON in markdown code blocks
6. Use exact count values - if user says 500, use count: 500

READY. Awaiting canvas context and user command.`;

// Functions for function calling (matching frontend)
const functions = [
  {
    name: 'create_shape',
    description: 'Create ONE shape on the canvas. WARNING: ONLY use for 1-2 shapes! For 3+ shapes, grids, or bulk operations, return JSON actions instead with BULK_CREATE or CREATE action type.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['rectangle', 'circle', 'triangle'],
          description: 'The type of shape to create'
        },
        x: { type: 'number', description: 'X coordinate (0-5000)', minimum: 0, maximum: 5000 },
        y: { type: 'number', description: 'Y coordinate (0-5000)', minimum: 0, maximum: 5000 },
        width: { type: 'number', description: 'Width (20-1000)', minimum: 20, maximum: 1000, default: 100 },
        height: { type: 'number', description: 'Height (20-1000)', minimum: 20, maximum: 1000, default: 100 },
        fill: { type: 'string', description: 'Color hex code', default: '#CCCCCC' },
        text: { type: 'string', description: 'Optional text label' }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'move_shape',
    description: 'Move a shape to a new position',
    parameters: {
      type: 'object',
      properties: {
        shapeId: { type: 'string', description: 'ID of the shape to move' },
        x: { type: 'number', description: 'New X coordinate', minimum: 0, maximum: 5000 },
        y: { type: 'number', description: 'New Y coordinate', minimum: 0, maximum: 5000 }
      },
      required: ['shapeId', 'x', 'y']
    }
  },
  {
    name: 'get_canvas_state',
    description: 'Get current canvas state with all shapes',
    parameters: { type: 'object', properties: {}, required: [] }
  }
];

// CORS headers for frontend communication
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200)
      .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
      .setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
      .end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Validate API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured in Vercel environment');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'API key not configured. Please set OPENAI_API_KEY in Vercel environment variables.'
      });
      return;
    }

    // Parse and validate request body
    const { message, canvasContext, userId } = req.body;
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Message is required and must be a string'
      });
      return;
    }

    // Basic rate limiting check (you may want to implement more sophisticated rate limiting)
    // For now, we'll just validate the user ID exists
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
      return;
    }

    console.log('Processing agent request:', {
      userId,
      messageLength: message.length,
      hasContext: !!canvasContext,
      timestamp: new Date().toISOString()
    });

    // Initialize LLM with function calling
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      streaming: false,
      maxTokens: 2000,
      apiKey: apiKey,
    });

    // Prepare canvas context
    const canvasState = {
      shapes: canvasContext?.shapes || [],
      selectedShapeIds: canvasContext?.selectedShapes || [],
    };
    
    // Create dynamic context string
    const shapeCount = canvasState.shapes.length;
    const dynamicContext = shapeCount === 0 
      ? `CANVAS: Empty canvas (5000×5000)\nUSER: ${userId}`
      : `CANVAS STATE (5000×5000):\nTotal: ${shapeCount} shapes\n\nShapes:\n${canvasState.shapes.slice(0, 20).map((s: any) => `"${s.id}": ${s.type} at (${s.x},${s.y}) ${s.width}×${s.height} ${s.fill}`).join('\n')}${shapeCount > 20 ? `\n... and ${shapeCount - 20} more shapes` : ''}\n\nUSER: ${userId}`;

    // Build messages for function calling
    const messages = [
      new SystemMessage(STATIC_SYSTEM_PROMPT),
      new SystemMessage(dynamicContext),
      new HumanMessage(message),
    ];

    // Call LLM with function calling
    const response = await llm.invoke(messages, {
      functions: functions,
      function_call: 'auto' as any,
    });

    // Check if LLM wants to call a function
    if (response.additional_kwargs?.function_call) {
      console.log('🔧 LLM requested function call:', response.additional_kwargs.function_call.name);
      
      // For backend, we can't execute functions server-side since they need Firebase access
      // Instead, we convert function calls to JSON actions for the frontend to execute
      const functionCall = response.additional_kwargs.function_call;
      const functionName = functionCall.name;
      const functionArgs = JSON.parse(functionCall.arguments);
      
      // Convert function call to action
      let action: any;
      if (functionName === 'create_shape') {
        action = {
          type: 'CREATE',
          shape: functionArgs.type,
          x: functionArgs.x,
          y: functionArgs.y,
          width: functionArgs.width || 100,
          height: functionArgs.height || 100,
          fill: functionArgs.fill || '#CCCCCC',
          text: functionArgs.text
        };
      } else if (functionName === 'move_shape') {
        action = {
          type: 'MOVE',
          shapeId: functionArgs.shapeId,
          x: functionArgs.x,
          y: functionArgs.y
        };
      } else if (functionName === 'get_canvas_state') {
        // Return current canvas state
        return res.status(200)
          .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
          .json({
            success: true,
            message: `Canvas has ${shapeCount} shapes`,
            canvasState: canvasState
          });
      }
      
      // Return the converted action
      const content = response.content ? response.content.toString() : `Executed ${functionName}`;
      return res.status(200)
        .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
        .json({
          success: true,
          actions: [action],
          message: content
        });
    }

    // No function call - parse JSON response
    const content = response.content.toString();

    console.log('LLM response:', content.substring(0, 200));

    // Try to parse JSON response
    let parsedResponse: AgentResponse;
    try {
      console.log('🔍 Parsing backend response, length:', content.length);
      console.log('📝 First 200 chars:', content.substring(0, 200));
      
      // Remove markdown code blocks if present
      let cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('✅ Found JSON match, attempting parse...');
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check if it has actions array (multiple actions) - this is the format we want
        if (parsed.actions && Array.isArray(parsed.actions)) {
          console.log('✅ Actions array found, count:', parsed.actions.length);
          parsedResponse = {
            success: true,
            actions: parsed.actions,
            message: parsed.summary || parsed.message || 'Actions completed',
          };
        } 
        // Legacy: Check if it has single action wrapped in action object
        else if (parsed.action) {
          console.log('⚠️ Legacy single action format');
          parsedResponse = {
            success: true,
            action: parsed.action,
            message: parsed.summary || parsed.message || 'Action completed',
          };
        } 
        // No action found
        else {
          console.warn('⚠️ No action or actions found in response:', content.substring(0, 200));
          parsedResponse = {
            success: true,
            message: content,
          };
        }
      } else {
        // No JSON found
        console.warn('⚠️ Could not find JSON in response:', content.substring(0, 200));
        parsedResponse = {
          success: true,
          message: content,
        };
      }
    } catch (parseError) {
      console.error('❌ Error parsing LLM response:', parseError);
      console.error('📝 Raw content:', content.substring(0, 500));
      parsedResponse = {
        success: true,
        message: content,
      };
    }

    // Log success
    console.log('Request completed successfully:', {
      userId,
      hasAction: !!parsedResponse.action,
      timestamp: new Date().toISOString()
    });

    // Return response with CORS headers
    res
      .status(200)
      .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .json(parsedResponse);

  } catch (error) {
    console.error('Agent endpoint error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res
      .status(500)
      .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .json({
        success: false,
        error: 'Server error',
        message: 'Failed to process agent request: ' + errorMessage
      });
  }
}

