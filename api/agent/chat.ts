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
      temperature: 0.1,
      streaming: false,
      maxTokens: 500,
      apiKey: apiKey,
    });

    // Prepare canvas context string
    const shapesInfo = JSON.stringify(canvasContext?.shapes || []);
    
    // Use the same prompt as local dev for consistency
    const systemPrompt = `You are a CollabCanvas AI that creates and arranges shapes via JSON commands.

CANVAS INFO:
- Size: 5000×5000px | Types: rectangle, circle | Colors: red, green, blue, yellow, purple, pink, teal, grey
- Defaults: position (300, 300), size 100×100px, color grey, spacing 120px

JSON OUTPUT (required):
{
  "reasoning": "brief",
  "actions": [{ "type": "CREATE|MOVE|RESIZE|DELETE|ARRANGE|UPDATE", "shape": "rectangle|circle", "x": num, "y": num, "width": num, "height": num, "fill": "#hex", "shapeId": "id", "shapeIds": ["id1","id2"], "layout": "horizontal|vertical|grid", "spacing": num }],
  "summary": "what you did"
}

RULES:
- Use actual shape IDs from context (never "shape1", "shape2")
- Keep positions 0-5000, sizes 20-1000
- Default to x:300, y:300 if no position specified
- For ARRANGE: use real shape IDs

EXAMPLES:
User: "Create red circle"
{"reasoning":"create circle at default position","actions":[{"type":"CREATE","shape":"circle","x":300,"y":300,"fill":"#ef4444"}],"summary":"Created red circle"}

User: "Create blue rectangle at 500, 600"
{"reasoning":"create rectangle at specified position","actions":[{"type":"CREATE","shape":"rectangle","x":500,"y":600,"fill":"#3b82f6"}],"summary":"Created blue rectangle"}

User: "Create a 3x3 grid"
{"reasoning":"create 9 rectangles in 3x3 pattern","actions":[{"type":"CREATE","shape":"rectangle","x":100,"y":100,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":220,"y":100,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":340,"y":100,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":100,"y":220,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":220,"y":220,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":340,"y":220,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":100,"y":340,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":220,"y":340,"width":100,"height":100,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":340,"y":340,"width":100,"height":100,"fill":"#ef4444"}],"summary":"Created a 3x3 grid of rectangles"}

User: "Create a login form"
{"reasoning":"create login form with header, username field, password field, and button","actions":[{"type":"CREATE","shape":"rectangle","x":300,"y":200,"width":400,"height":60,"fill":"#3b82f6"},{"type":"CREATE","shape":"rectangle","x":300,"y":280,"width":400,"height":50,"fill":"#CCCCCC"},{"type":"CREATE","shape":"rectangle","x":300,"y":350,"width":400,"height":50,"fill":"#CCCCCC"},{"type":"CREATE","shape":"rectangle","x":300,"y":420,"width":400,"height":50,"fill":"#22c55e"}],"summary":"Created login form with header, username field, password field, and login button"}

User: "Create a navigation bar"
{"reasoning":"create horizontal nav bar with logo and menu items","actions":[{"type":"CREATE","shape":"rectangle","x":100,"y":50,"width":1000,"height":80,"fill":"#3b82f6"},{"type":"CREATE","shape":"rectangle","x":120,"y":65,"width":100,"height":50,"fill":"#ef4444"},{"type":"CREATE","shape":"rectangle","x":800,"y":70,"width":80,"height":40,"fill":"#CCCCCC"},{"type":"CREATE","shape":"rectangle","x":900,"y":70,"width":80,"height":40,"fill":"#CCCCCC"}],"summary":"Created navigation bar with logo and menu buttons"}

CONTEXT: ${shapesInfo}

User: "${message}"
JSON:`;

    // Get LLM response
    const response = await llm.invoke(systemPrompt);
    const content = response.content.toString();

    console.log('LLM response:', content.substring(0, 200));

    // Try to parse JSON response
    let parsedResponse: AgentResponse;
    try {
      // Try to find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check if it has actions array (multiple actions) - this is the format we want
        if (parsed.actions && Array.isArray(parsed.actions)) {
          parsedResponse = {
            success: true,
            actions: parsed.actions,
            message: parsed.summary || parsed.message || 'Actions completed',
          };
        } 
        // Legacy: Check if it has single action wrapped in action object
        else if (parsed.action) {
          parsedResponse = {
            success: true,
            action: parsed.action,
            message: parsed.summary || parsed.message || 'Action completed',
          };
        } 
        // No action found
        else {
          console.warn('No action or actions found in response:', content.substring(0, 200));
          parsedResponse = {
            success: true,
            message: content,
          };
        }
      } else {
        // No JSON found
        console.warn('Could not parse JSON from response:', content.substring(0, 200));
        parsedResponse = {
          success: true,
          message: content,
        };
      }
    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
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

