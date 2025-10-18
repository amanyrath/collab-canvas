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

    // Create a simplified prompt for canvas actions
    const systemPrompt = `You are an AI assistant that helps users create shapes on a canvas.
You can execute canvas actions by responding with JSON.

Available actions:
1. create_shape - Create a new shape
2. move_shape - Move an existing shape
3. update_shape - Update shape properties
4. delete_shape - Delete a shape
5. arrange_shapes - Arrange multiple shapes

Canvas context:
- Canvas size: 1200x800
- Available shapes: rectangle, circle, triangle
- Shapes on canvas: ${JSON.stringify(canvasContext?.shapes || [])}

Respond with a JSON object in this format:
{
  "action": {
    "type": "create_shape",
    "properties": { ... }
  },
  "message": "Description of what you did"
}

If you can't perform an action, respond with:
{
  "message": "Explanation of why you can't do it"
}`;

    // Create prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    // Format the prompt with user input
    const formattedPrompt = await prompt.format({
      input: message,
    });

    // Get LLM response
    const response = await llm.invoke(formattedPrompt);
    const content = response.content.toString();

    console.log('LLM response:', content.substring(0, 200));

    // Try to parse JSON response
    let parsedResponse: AgentResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedResponse = {
          success: true,
          action: parsed.action,
          message: parsed.message || 'Action completed',
        };
      } else {
        // Plain text response
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

