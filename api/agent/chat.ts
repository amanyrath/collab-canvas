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
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';

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

    // Initialize LLM
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: false,
      maxTokens: 2000, // Increased for complex multi-shape designs
      apiKey: apiKey,
    });

    // Prepare canvas context
    const canvasState = {
      shapes: canvasContext?.shapes || [],
      selectedShapeIds: canvasContext?.selectedShapes || [],
    };
    
    // Use the new artistic system prompt (matches frontend exactly)
    const systemPrompt = `You are a creative artist & designer AI for CollabCanvas. Create beautiful art, abstract designs, and functional layouts.

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

Be wildly creative. Layer shapes. Create gradients. Make art.

CANVAS STATE: ${JSON.stringify(canvasState)}

User: "${message}"
JSON:`;

    // Get LLM response
    const response = await llm.invoke(systemPrompt);
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

