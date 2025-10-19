/**
 * Canvas Tools for LangChain Agent
 * 
 * These tools allow the AI agent to interact with the CollabCanvas
 * by creating, moving, resizing, deleting, and arranging shapes.
 */

import { Tool } from '@langchain/core/tools';
import { createShape, updateShape, deleteShape } from '../../utils/shapeUtils';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasState } from '../types';

/**
 * Get current canvas state for context
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
 * Canvas bounds and validation
 */
const CANVAS_WIDTH = 5000;
const CANVAS_HEIGHT = 5000;
const MIN_SIZE = 20;
const MAX_SIZE = 1000;

function validatePosition(x: number, y: number, width: number = 100, height: number = 100): boolean {
  return x >= 0 && y >= 0 && 
         x + width <= CANVAS_WIDTH && 
         y + height <= CANVAS_HEIGHT;
}

function validateSize(width: number, height: number): boolean {
  return width >= MIN_SIZE && width <= MAX_SIZE &&
         height >= MIN_SIZE && height <= MAX_SIZE;
}

/**
 * Color validation and normalization
 */
// Available colors for validation (currently not enforced but kept for reference)
// const VALID_COLORS = [
//   '#CCCCCC', // Grey
//   '#ef4444', // Red
//   '#22c55e', // Green
//   '#3b82f6', // Blue
//   '#f59e0b', // Yellow
//   '#8b5cf6', // Purple
//   '#ec4899', // Pink
//   '#14b8a6', // Teal
// ];

function normalizeColor(color: string): string {
  const lowerColor = color.toLowerCase().trim();
  
  // Handle hex colors
  if (lowerColor.startsWith('#')) {
    return lowerColor;
  }
  
  // Handle common color names
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
  };
  
  return colorMap[lowerColor] || '#CCCCCC';
}

/**
 * CreateShapeTool - Create shapes on the canvas
 */
export class CreateShapeTool extends Tool {
  name = 'create_shape';
  description = `Create a new shape on the canvas. 
    Input should be a JSON string with:
    type (rectangle or circle), x (0-5000), y (0-5000), width (20-1000, optional, default 100), height (20-1000, optional, default 100), fill (color hex or name, optional, default grey), userId (required), displayName (required).
    Returns the ID of the created shape.`;

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { type, x, y, width = 100, height = 100, fill = '#CCCCCC', userId, displayName } = params;
      
      // Validation
      if (!['rectangle', 'circle', 'triangle'].includes(type)) {
        return JSON.stringify({ error: 'Invalid shape type. Must be "rectangle", "circle", or "triangle"' });
      }
      
      if (!userId || !displayName) {
        return JSON.stringify({ error: 'userId and displayName are required' });
      }
      
      if (!validatePosition(x, y, width, height)) {
        return JSON.stringify({ error: 'Shape position is out of canvas bounds' });
      }
      
      if (!validateSize(width, height)) {
        return JSON.stringify({ error: `Size must be between ${MIN_SIZE} and ${MAX_SIZE}` });
      }
      
      const normalizedColor = normalizeColor(fill);
      
      // Create shape
      const shapeId = await createShape(x, y, type, normalizedColor, userId, displayName);
      
      return JSON.stringify({
        success: true,
        shapeId,
        message: `Created ${type} at (${x}, ${y})`
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create shape'
      });
    }
  }
}

/**
 * MoveShapeTool - Move existing shapes
 */
export class MoveShapeTool extends Tool {
  name = 'move_shape';
  description = `Move a shape to a new position.
    Input should be a JSON string with: shapeId (string), x (0-5000), y (0-5000), userId (required).
    Returns success status.`;

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { shapeId, x, y, userId } = params;
      
      if (!shapeId || !userId) {
        return JSON.stringify({ error: 'shapeId and userId are required' });
      }
      
      // Get current shape to check size
      const { shapes } = useCanvasStore.getState();
      const shape = shapes.find(s => s.id === shapeId);
      
      if (!shape) {
        return JSON.stringify({ error: 'Shape not found' });
      }
      
      if (!validatePosition(x, y, shape.width, shape.height)) {
        return JSON.stringify({ error: 'New position is out of canvas bounds' });
      }
      
      await updateShape(shapeId, { x, y }, userId);
      
      return JSON.stringify({
        success: true,
        message: `Moved shape to (${x}, ${y})`
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to move shape'
      });
    }
  }
}

/**
 * ResizeShapeTool - Resize existing shapes
 */
export class ResizeShapeTool extends Tool {
  name = 'resize_shape';
  description = `Resize a shape.
    Input should be a JSON string with: shapeId (string), width (20-1000), height (20-1000), userId (required).
    Returns success status.`;

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { shapeId, width, height, userId } = params;
      
      if (!shapeId || !userId) {
        return JSON.stringify({ error: 'shapeId and userId are required' });
      }
      
      if (!validateSize(width, height)) {
        return JSON.stringify({ error: `Size must be between ${MIN_SIZE} and ${MAX_SIZE}` });
      }
      
      // Check bounds
      const { shapes } = useCanvasStore.getState();
      const shape = shapes.find(s => s.id === shapeId);
      
      if (!shape) {
        return JSON.stringify({ error: 'Shape not found' });
      }
      
      if (!validatePosition(shape.x, shape.y, width, height)) {
        return JSON.stringify({ error: 'New size would exceed canvas bounds' });
      }
      
      await updateShape(shapeId, { width, height }, userId);
      
      return JSON.stringify({
        success: true,
        message: `Resized shape to ${width}×${height}`
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to resize shape'
      });
    }
  }
}

/**
 * DeleteShapeTool - Delete shapes
 */
export class DeleteShapeTool extends Tool {
  name = 'delete_shape';
  description = `Delete a shape from the canvas.
    Input should be a JSON string with: shapeId (string).
    Returns success status.`;

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { shapeId } = params;
      
      if (!shapeId) {
        return JSON.stringify({ error: 'shapeId is required' });
      }
      
      await deleteShape(shapeId);
      
      return JSON.stringify({
        success: true,
        message: 'Shape deleted successfully'
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete shape'
      });
    }
  }
}

/**
 * ArrangeShapesTool - Arrange multiple shapes in layouts
 */
export class ArrangeShapesTool extends Tool {
  name = 'arrange_shapes';
  description = `Arrange multiple shapes in a layout pattern.
    Input should be a JSON string with: shapeIds (array of strings), layout (horizontal, vertical, or grid), startX (optional, default 100), startY (optional, default 100), spacing (optional, default 120), userId (required).
    Returns success status with new positions.`;

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { shapeIds, layout, startX = 100, startY = 100, spacing = 120, userId } = params;
      
      if (!shapeIds || !Array.isArray(shapeIds) || shapeIds.length === 0) {
        return JSON.stringify({ error: 'shapeIds array is required and must not be empty' });
      }
      
      if (!['horizontal', 'vertical', 'grid'].includes(layout)) {
        return JSON.stringify({ error: 'layout must be "horizontal", "vertical", or "grid"' });
      }
      
      if (!userId) {
        return JSON.stringify({ error: 'userId is required' });
      }
      
      const { shapes } = useCanvasStore.getState();
      const shapesToArrange = shapes.filter(s => shapeIds.includes(s.id));
      
      if (shapesToArrange.length === 0) {
        return JSON.stringify({ error: 'No valid shapes found with provided IDs' });
      }
      
      const updates: Array<{ shapeId: string; x: number; y: number }> = [];
      
      if (layout === 'horizontal') {
        let currentX = startX;
        for (const shape of shapesToArrange) {
          updates.push({ shapeId: shape.id, x: currentX, y: startY });
          await updateShape(shape.id, { x: currentX, y: startY }, userId);
          currentX += spacing;
        }
      } else if (layout === 'vertical') {
        let currentY = startY;
        for (const shape of shapesToArrange) {
          updates.push({ shapeId: shape.id, x: startX, y: currentY });
          await updateShape(shape.id, { x: startX, y: currentY }, userId);
          currentY += spacing;
        }
      } else if (layout === 'grid') {
        const cols = Math.ceil(Math.sqrt(shapesToArrange.length));
        let index = 0;
        for (const shape of shapesToArrange) {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = startX + (col * spacing);
          const y = startY + (row * spacing);
          updates.push({ shapeId: shape.id, x, y });
          await updateShape(shape.id, { x, y }, userId);
          index++;
        }
      }
      
      return JSON.stringify({
        success: true,
        message: `Arranged ${shapesToArrange.length} shapes in ${layout} layout`,
        updates
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to arrange shapes'
      });
    }
  }
}

/**
 * GetCanvasStateTool - Query current canvas state
 */
export class GetCanvasStateTool extends Tool {
  name = 'get_canvas_state';
  description = `Get the current state of the canvas including all shapes and their properties.
    Input: empty string
    Returns: Canvas state with all shapes`;

  async _call(_input: string): Promise<string> {
    try {
      const state = getCanvasState();
      return JSON.stringify({
        success: true,
        state
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get canvas state'
      });
    }
  }
}

/**
 * Export all canvas tools
 */
export const canvasTools = [
  new CreateShapeTool(),
  new MoveShapeTool(),
  new ResizeShapeTool(),
  new DeleteShapeTool(),
  new ArrangeShapesTool(),
  new GetCanvasStateTool(),
];

