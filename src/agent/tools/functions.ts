/**
 * OpenAI Function Definitions for AI Canvas Agent
 * 
 * Defines tools as OpenAI functions for native function calling
 */

import { createShape, updateShape, deleteShape } from '../../utils/shapeUtils';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasState } from '../types';

/**
 * OpenAI function definitions
 */
export const functions = [
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
        x: {
          type: 'number',
          description: 'X coordinate (0-5000)',
          minimum: 0,
          maximum: 5000
        },
        y: {
          type: 'number',
          description: 'Y coordinate (0-5000)',
          minimum: 0,
          maximum: 5000
        },
        width: {
          type: 'number',
          description: 'Width in pixels (20-1000)',
          minimum: 20,
          maximum: 1000,
          default: 100
        },
        height: {
          type: 'number',
          description: 'Height in pixels (20-1000)',
          minimum: 20,
          maximum: 1000,
          default: 100
        },
        fill: {
          type: 'string',
          description: 'Color hex code (e.g., #ef4444) or color name (red, blue, green)',
          default: '#CCCCCC'
        },
        text: {
          type: 'string',
          description: 'Optional text label for the shape'
        }
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
        shapeId: {
          type: 'string',
          description: 'ID of the shape to move'
        },
        x: {
          type: 'number',
          description: 'New X coordinate (0-5000)',
          minimum: 0,
          maximum: 5000
        },
        y: {
          type: 'number',
          description: 'New Y coordinate (0-5000)',
          minimum: 0,
          maximum: 5000
        }
      },
      required: ['shapeId', 'x', 'y']
    }
  },
  {
    name: 'resize_shape',
    description: 'Resize a shape',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to resize'
        },
        width: {
          type: 'number',
          description: 'New width (20-1000)',
          minimum: 20,
          maximum: 1000
        },
        height: {
          type: 'number',
          description: 'New height (20-1000)',
          minimum: 20,
          maximum: 1000
        }
      },
      required: ['shapeId', 'width', 'height']
    }
  },
  {
    name: 'delete_shape',
    description: 'Delete a shape from the canvas',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to delete'
        }
      },
      required: ['shapeId']
    }
  },
  {
    name: 'get_canvas_state',
    description: 'Get current canvas state with all shapes (use this to see what shapes exist before modifying them)',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'search_design_knowledge',
    description: 'Search the web for UI/UX design patterns, layout best practices, or component structure information. Use this when creating unfamiliar UI components (login forms, dashboards, cards, etc.)',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "login form layout best practices", "dashboard design patterns")'
        }
      },
      required: ['query']
    }
  }
];

/**
 * Color normalization
 */
function normalizeColor(color: string): string {
  const lowerColor = color.toLowerCase().trim();
  
  if (lowerColor.startsWith('#')) {
    return lowerColor;
  }
  
  const colorMap: Record<string, string> = {
    'red': '#ef4444',
    'green': '#22c55e',
    'blue': '#3b82f6',
    'yellow': '#f59e0b',
    'purple': '#8b5cf6',
    'pink': '#ec4899',
    'teal': '#14b8a6',
    'grey': '#CCCCCC',
    'gray': '#CCCCCC',
    'white': '#ffffff',
  };
  
  return colorMap[lowerColor] || '#CCCCCC';
}

/**
 * Get current canvas state
 * Exported for use in context builders
 */
export function getCanvasState(): CanvasState {
  const { shapes } = useCanvasStore.getState();
  
  return {
    shapes: shapes.map(s => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      fill: s.fill,
      text: s.text || '',
      isLocked: s.isLocked,
      lockedBy: s.lockedBy || undefined,
    })),
    canvasWidth: 5000,
    canvasHeight: 5000,
  };
}

/**
 * Tavily search implementation
 */
async function searchDesignKnowledge(query: string): Promise<string> {
  const { getTavilyKey, isAgentEnvironmentSecure } = await import('../../utils/keyManager');
  
  // Check if we can use real Tavily API
  if (isAgentEnvironmentSecure()) {
    const apiKey = getTavilyKey();
    
    if (apiKey && apiKey !== 'your_tavily_api_key_here') {
      try {
        // Use Tavily API directly
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: `UI design ${query} best practices`,
            max_results: 3,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return JSON.stringify(data.results || []);
        }
      } catch (error) {
        console.warn('Tavily API failed, using fallback knowledge:', error);
      }
    }
  }
  
  // Fallback: Built-in design knowledge
  return getMockDesignKnowledge(query);
}

/**
 * Mock design knowledge for when Tavily is unavailable
 */
function getMockDesignKnowledge(query: string): string {
  const designKnowledge: Record<string, any> = {
    'login form': [{
      title: 'Login Form Best Practices',
      content: 'A standard login form includes: (1) Username/email label + input field at top (2) Password label + input field below (3) Submit button at bottom. Spacing: 20-40px between fields. Field size: 300-400px width, 50-60px height. Button: centered or full-width, 40-50px height. Use light grey (#f3f4f6) for labels, white (#ffffff) for inputs, blue (#3b82f6) for button.',
      url: 'design-system/forms'
    }],
    'dashboard': [{
      title: 'Dashboard Layout Patterns',
      content: 'Modern dashboard layout: (1) Header bar at top (full width, 60-80px height, dark color) (2) Sidebar navigation on left (200-300px width, light grey) with menu items (3) Main content area with panels/cards (4) Stats or KPI widgets (typically 2-4 across top) (5) Charts or data table below. Use consistent spacing (20-40px) and white background for content panels.',
      url: 'design-system/dashboards'
    }],
    'card': [{
      title: 'Card Component Design',
      content: 'Product/content card structure: (1) Container rectangle (white or light grey, 300-400px width, 400-500px height) (2) Image area at top (180-220px height, grey placeholder) (3) Title text (30-40px height, bold) (4) Description text (60-80px height) (5) Action button at bottom (120-200px width, 40-50px height). Padding: 15-20px inside card.',
      url: 'design-system/cards'
    }],
    'form': [{
      title: 'Form Layout Best Practices',
      content: 'Forms should have: (1) Clear labels above or beside each input (2) Input fields (rectangles, 250-400px width, 45-60px height, white fill) (3) Vertical spacing of 20-40px between field pairs (4) Submit button at bottom (centered or left-aligned, prominent color). Group related fields together with extra spacing (40-60px). Use light grey for labels, white for inputs.',
      url: 'design-system/forms'
    }],
  };
  
  const lowerQuery = query.toLowerCase();
  for (const [keyword, response] of Object.entries(designKnowledge)) {
    if (lowerQuery.includes(keyword)) {
      return JSON.stringify(response);
    }
  }
  
  return JSON.stringify([{
    title: 'Design Information',
    content: 'Consider: spacing (100-120px), alignment (centered or left-aligned), color consistency, and visual hierarchy. Break down UI components into basic rectangles, circles, and triangles.',
    url: 'design-basics'
  }]);
}

/**
 * Execute a function call
 */
export async function executeFunction(
  name: string,
  args: any,
  userId: string,
  displayName: string
): Promise<any> {
  console.log(`🔧 Executing function: ${name}`, args);
  
  try {
    switch (name) {
      case 'create_shape': {
        const { type, x, y, fill = '#CCCCCC', text } = args;
        const normalizedColor = normalizeColor(fill);
        
        const shapeId = await createShape(x, y, type, normalizedColor, userId, displayName);
        
        // Add text and size if provided
        const updates: any = {};
        if (text) updates.text = text;
        if (args.width) updates.width = args.width;
        if (args.height) updates.height = args.height;
        
        if (Object.keys(updates).length > 0) {
          await updateShape(shapeId, updates, userId);
        }
        
        return {
          success: true,
          shapeId,
          message: `Created ${type} at (${x}, ${y})`
        };
      }
      
      case 'move_shape': {
        const { shapeId, x, y } = args;
        await updateShape(shapeId, { x, y }, userId);
        return {
          success: true,
          message: `Moved shape to (${x}, ${y})`
        };
      }
      
      case 'resize_shape': {
        const { shapeId, width, height } = args;
        await updateShape(shapeId, { width, height }, userId);
        return {
          success: true,
          message: `Resized shape to ${width}×${height}`
        };
      }
      
      case 'delete_shape': {
        const { shapeId } = args;
        await deleteShape(shapeId);
        return {
          success: true,
          message: 'Shape deleted successfully'
        };
      }
      
      case 'get_canvas_state': {
        const state = getCanvasState();
        return {
          success: true,
          state
        };
      }
      
      case 'search_design_knowledge': {
        const { query } = args;
        const results = await searchDesignKnowledge(query);
        return {
          success: true,
          results: JSON.parse(results)
        };
      }
      
      default:
        return {
          success: false,
          error: `Unknown function: ${name}`
        };
    }
  } catch (error) {
    console.error(`Function ${name} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

