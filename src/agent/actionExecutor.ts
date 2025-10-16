/**
 * Action Executor for AI Canvas Agent
 * 
 * Executes validated agent actions on the canvas by calling
 * the appropriate tools and utilities.
 */

import { createShape, updateShape, deleteShape } from '../utils/shapeUtils';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasAction, AgentResponse, UserContext } from './types';

/**
 * Execution result for a single action
 */
export interface ActionResult {
  success: boolean;
  action: CanvasAction;
  message?: string;
  error?: string;
  shapeId?: string;
}

/**
 * Result of executing all actions in a response
 */
export interface ExecutionResult {
  overallSuccess: boolean;
  results: ActionResult[];
  successCount: number;
  failureCount: number;
  totalActions: number;
}

/**
 * Timeout wrapper for action execution to prevent hanging on Firebase issues
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  actionType: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Action ${actionType} timed out after ${timeoutMs}ms - possible Firebase connection issue`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute all actions from an agent response
 * 
 * @param agentResponse - The validated response from the agent
 * @param userContext - User context for attribution
 * @returns Execution results for all actions
 */
export async function executeAgentActions(
  agentResponse: AgentResponse,
  userContext: UserContext
): Promise<ExecutionResult> {
  const results: ActionResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  console.log(`🤖 Executing ${agentResponse.actions.length} actions from agent`);

  for (const action of agentResponse.actions) {
    try {
      // Add 10 second timeout to prevent hanging on Firebase connection issues
      const result = await withTimeout(
        executeAction(action, userContext),
        10000,
        action.type
      );
      results.push(result);

      if (result.success) {
        successCount++;
        console.log(`✅ Action ${action.type} succeeded:`, result.message);
      } else {
        failureCount++;
        console.error(`❌ Action ${action.type} failed:`, result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Action execution failed:`, error);
      
      results.push({
        success: false,
        action,
        error: errorMessage,
      });
      failureCount++;
    }
  }

  const overallSuccess = failureCount === 0 && successCount > 0;

  console.log(`✅ Execution complete: ${successCount} succeeded, ${failureCount} failed`);

  return {
    overallSuccess,
    results,
    successCount,
    failureCount,
    totalActions: agentResponse.actions.length,
  };
}

/**
 * Execute a single canvas action
 */
async function executeAction(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  console.log(`🔨 Executing ${action.type} action:`, JSON.stringify(action, null, 2));

  switch (action.type) {
    case 'CREATE':
      return await executeCreate(action, userContext);
    
    case 'MOVE':
      return await executeMove(action, userContext);
    
    case 'RESIZE':
      return await executeResize(action, userContext);
    
    case 'DELETE':
      return await executeDelete(action);
    
    case 'ARRANGE':
      return await executeArrange(action, userContext);
    
    case 'UPDATE':
      return await executeUpdate(action, userContext);
    
    default:
      return {
        success: false,
        action,
        error: `Unknown action type: ${action.type}`,
      };
  }
}

/**
 * Execute CREATE action
 */
async function executeCreate(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  if (!action.shape || !['rectangle', 'circle'].includes(action.shape)) {
    return {
      success: false,
      action,
      error: 'Invalid or missing shape type',
    };
  }

  if (typeof action.x !== 'number' || typeof action.y !== 'number') {
    return {
      success: false,
      action,
      error: 'Invalid or missing position',
    };
  }

  // Defaults
  const width = action.width || 100;
  const height = action.height || 100;
  const fill = action.fill || '#CCCCCC';

  // Validate bounds
  if (action.x < 0 || action.y < 0 || action.x + width > 5000 || action.y + height > 5000) {
    return {
      success: false,
      action,
      error: 'Shape position exceeds canvas bounds',
    };
  }

  try {
    console.log(`📝 Calling createShape with:`, {
      x: action.x,
      y: action.y,
      type: action.shape,
      fill,
      userId: userContext.userId,
      displayName: userContext.displayName
    });

    const shapeId = await createShape(
      action.x,
      action.y,
      action.shape,
      fill,
      userContext.userId,
      userContext.displayName
    );

    console.log(`✅ createShape returned shapeId: ${shapeId}`);

    // Lock the shape so user can immediately delete it if needed
    try {
      await updateShape(shapeId, {
        isLocked: true,
        lockedBy: userContext.userId,
        lockedByName: userContext.displayName,
        lockedByColor: userContext.cursorColor,
      }, userContext.userId);
      console.log(`✅ Shape locked for user`);
    } catch (lockError) {
      console.warn(`⚠️ Could not lock shape:`, lockError);
    }

    // If custom size was specified, update it
    if (action.width !== undefined || action.height !== undefined) {
      try {
        console.log(`📝 Updating size to ${width}×${height}`);
        await updateShape(shapeId, { width, height }, userContext.userId);
        console.log(`✅ Size updated`);
      } catch (updateError) {
        // Ignore update errors - shape was created successfully with default size
        console.warn(`⚠️ Size update failed (shape created with default size):`, updateError);
      }
    }

    // If text was specified, add it
    if (action.text) {
      try {
        console.log(`📝 Adding text: ${action.text}`);
        await updateShape(shapeId, { text: action.text }, userContext.userId);
        console.log(`✅ Text added`);
      } catch (updateError) {
        console.warn(`⚠️ Text update failed:`, updateError);
      }
    }

    console.log(`✅ Created ${action.shape}: ${shapeId}`);

    return {
      success: true,
      action,
      shapeId,
      message: `Created ${action.shape} at (${action.x}, ${action.y})`,
    };
  } catch (error) {
    console.error(`❌ CREATE failed with error:`, error);
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Create failed',
    };
  }
}

/**
 * Execute MOVE action
 */
async function executeMove(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  if (!action.shapeId) {
    return {
      success: false,
      action,
      error: 'Missing shapeId',
    };
  }

  if (typeof action.x !== 'number' || typeof action.y !== 'number') {
    return {
      success: false,
      action,
      error: 'Invalid or missing position',
    };
  }

  // Get shape to check size for bounds
  const { shapes } = useCanvasStore.getState();
  const shape = shapes.find(s => s.id === action.shapeId);

  if (!shape) {
    return {
      success: false,
      action,
      error: 'Shape not found',
    };
  }

  // Validate bounds
  if (action.x < 0 || action.y < 0 || 
      action.x + shape.width > 5000 || action.y + shape.height > 5000) {
    return {
      success: false,
      action,
      error: 'New position exceeds canvas bounds',
    };
  }

  try {
    await updateShape(action.shapeId, { x: action.x, y: action.y }, userContext.userId);

    console.log(`✅ Moved shape ${action.shapeId.slice(-8)} to (${action.x}, ${action.y})`);

    return {
      success: true,
      action,
      message: `Moved shape to (${action.x}, ${action.y})`,
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Move failed',
    };
  }
}

/**
 * Execute RESIZE action
 */
async function executeResize(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  if (!action.shapeId) {
    return {
      success: false,
      action,
      error: 'Missing shapeId',
    };
  }

  if (typeof action.width !== 'number' || typeof action.height !== 'number') {
    return {
      success: false,
      action,
      error: 'Invalid or missing dimensions',
    };
  }

  // Validate size
  if (action.width < 20 || action.width > 1000 || 
      action.height < 20 || action.height > 1000) {
    return {
      success: false,
      action,
      error: 'Size must be between 20 and 1000 pixels',
    };
  }

  // Get shape to check bounds
  const { shapes } = useCanvasStore.getState();
  const shape = shapes.find(s => s.id === action.shapeId);

  if (!shape) {
    return {
      success: false,
      action,
      error: 'Shape not found',
    };
  }

  // Validate bounds with new size
  if (shape.x + action.width > 5000 || shape.y + action.height > 5000) {
    return {
      success: false,
      action,
      error: 'New size would exceed canvas bounds',
    };
  }

  try {
    await updateShape(action.shapeId, {
      width: action.width,
      height: action.height
    }, userContext.userId);

    console.log(`✅ Resized shape ${action.shapeId.slice(-8)} to ${action.width}×${action.height}`);

    return {
      success: true,
      action,
      message: `Resized shape to ${action.width}×${action.height}`,
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Resize failed',
    };
  }
}

/**
 * Execute DELETE action
 */
async function executeDelete(action: CanvasAction): Promise<ActionResult> {
  if (!action.shapeId) {
    return {
      success: false,
      action,
      error: 'Missing shapeId',
    };
  }

  try {
    await deleteShape(action.shapeId);

    console.log(`✅ Deleted shape ${action.shapeId.slice(-8)}`);

    return {
      success: true,
      action,
      message: 'Shape deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Execute ARRANGE action
 */
async function executeArrange(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  if (!Array.isArray(action.shapeIds) || action.shapeIds.length === 0) {
    return {
      success: false,
      action,
      error: 'Missing or empty shapeIds array',
    };
  }

  if (!action.layout || !['horizontal', 'vertical', 'grid'].includes(action.layout)) {
    return {
      success: false,
      action,
      error: 'Invalid or missing layout type',
    };
  }

  const startX = action.x || 100;
  const startY = action.y || 100;
  const spacing = action.spacing || 120;

  const { shapes } = useCanvasStore.getState();
  const shapesToArrange = shapes.filter(s => action.shapeIds!.includes(s.id));

  if (shapesToArrange.length === 0) {
    return {
      success: false,
      action,
      error: 'No valid shapes found with provided IDs',
    };
  }

  try {
    if (action.layout === 'horizontal') {
      let currentX = startX;
      for (const shape of shapesToArrange) {
        await updateShape(shape.id, { x: currentX, y: startY }, userContext.userId);
        currentX += spacing;
      }
    } else if (action.layout === 'vertical') {
      let currentY = startY;
      for (const shape of shapesToArrange) {
        await updateShape(shape.id, { x: startX, y: currentY }, userContext.userId);
        currentY += spacing;
      }
    } else if (action.layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(shapesToArrange.length));
      let index = 0;
      for (const shape of shapesToArrange) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = startX + (col * spacing);
        const y = startY + (row * spacing);
        await updateShape(shape.id, { x, y }, userContext.userId);
        index++;
      }
    }

    console.log(`✅ Arranged ${shapesToArrange.length} shapes in ${action.layout} layout`);

    return {
      success: true,
      action,
      message: `Arranged ${shapesToArrange.length} shapes in ${action.layout} layout`,
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Arrange failed',
    };
  }
}

/**
 * Execute UPDATE action (generic property updates)
 */
async function executeUpdate(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  if (!action.shapeId) {
    return {
      success: false,
      action,
      error: 'Missing shapeId',
    };
  }

  // Build update object from action properties
  const updates: any = {};
  if (action.fill !== undefined) updates.fill = action.fill;
  if (action.text !== undefined) updates.text = action.text;
  if (action.x !== undefined) updates.x = action.x;
  if (action.y !== undefined) updates.y = action.y;
  if (action.width !== undefined) updates.width = action.width;
  if (action.height !== undefined) updates.height = action.height;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      action,
      error: 'No properties to update',
    };
  }

  try {
    await updateShape(action.shapeId, updates, userContext.userId);

    console.log(`✅ Updated shape ${action.shapeId.slice(-8)}:`, updates);

    return {
      success: true,
      action,
      message: `Updated shape properties`,
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * Dry run: validate actions without executing
 */
export async function validateActions(
  actions: CanvasAction[],
  userContext: UserContext
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    // Basic validation
    if (!action.type) {
      errors.push(`Action ${i}: Missing type`);
      continue;
    }

    // Type-specific validation (without execution)
    switch (action.type) {
      case 'CREATE':
        if (!action.shape) errors.push(`Action ${i}: Missing shape type`);
        if (action.x === undefined) errors.push(`Action ${i}: Missing x position`);
        if (action.y === undefined) errors.push(`Action ${i}: Missing y position`);
        break;

      case 'MOVE':
      case 'RESIZE':
      case 'DELETE':
      case 'UPDATE':
        if (!action.shapeId) errors.push(`Action ${i}: Missing shapeId`);
        break;

      case 'ARRANGE':
        if (!action.shapeIds || action.shapeIds.length === 0) {
          errors.push(`Action ${i}: Missing or empty shapeIds`);
        }
        if (!action.layout) errors.push(`Action ${i}: Missing layout`);
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

