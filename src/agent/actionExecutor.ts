/**
 * Action Executor for AI Canvas Agent
 * 
 * Executes validated agent actions on the canvas by calling
 * the appropriate tools and utilities.
 */

import { createShape, updateShape, deleteShape, createShapeBatch } from '../utils/shapeUtils';
import { clearAllShapes } from '../utils/devUtils';
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
  console.log(`🤖 Executing ${agentResponse.actions.length} actions from agent`);

  // Execute all actions in parallel for faster grid creation
  const actionPromises = agentResponse.actions.map(action => 
    withTimeout(
      executeAction(action, userContext),
      3000, // Reduced timeout: shapes create quickly
      action.type
    ).catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Action execution failed:`, error);
      return {
        success: false,
        action,
        error: errorMessage,
      } as ActionResult;
    })
  );

  // Wait for all actions to complete
  const results = await Promise.all(actionPromises);

  // Count successes and failures
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  // Log results
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ Action ${result.action.type} succeeded:`, result.message);
    } else {
      console.error(`❌ Action ${result.action.type} failed:`, result.error);
    }
  });

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
    
    case 'ALIGN':
      return await executeAlign(action, userContext);
    
    case 'BULK_CREATE':
      return await executeBulkCreate(action, userContext);
    
    case 'DELETE_ALL':
      return await executeDeleteAll(action);
    
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
  if (!action.shape || !['rectangle', 'circle', 'triangle'].includes(action.shape)) {
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
  const text = action.text || '';

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
      width,
      height,
      text,
      userId: userContext.userId,
      displayName: userContext.displayName
    });

    const shapeId = await createShape(
      action.x,
      action.y,
      action.shape,
      fill,
      userContext.userId,
      userContext.displayName,
      width,
      height,
      text
    );

    console.log(`✅ createShape returned shapeId: ${shapeId} with text: "${text}"`);

    // Build all updates to run in parallel for maximum speed
    const updates: any = {
      isLocked: true,
      lockedBy: userContext.userId,
      lockedByName: userContext.displayName,
      lockedByColor: userContext.cursorColor,
    };

    // Execute all updates in a single call for maximum performance
    try {
      await updateShape(shapeId, updates, userContext.userId);
      console.log(`✅ Shape updated (locked)`);
    } catch (updateError) {
      console.warn(`⚠️ Shape updates failed (shape created but not fully configured):`, updateError);
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
    // Execute all arrange updates in parallel for speed
    const updatePromises: Promise<void>[] = [];
    
    if (action.layout === 'horizontal') {
      let currentX = startX;
      for (const shape of shapesToArrange) {
        updatePromises.push(updateShape(shape.id, { x: currentX, y: startY }, userContext.userId));
        currentX += spacing;
      }
    } else if (action.layout === 'vertical') {
      let currentY = startY;
      for (const shape of shapesToArrange) {
        updatePromises.push(updateShape(shape.id, { x: startX, y: currentY }, userContext.userId));
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
        updatePromises.push(updateShape(shape.id, { x, y }, userContext.userId));
        index++;
      }
    }
    
    // Wait for all updates to complete in parallel
    await Promise.all(updatePromises);

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
 * Execute ALIGN action
 */
async function executeAlign(
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

  if (!action.alignment) {
    return {
      success: false,
      action,
      error: 'Missing alignment type',
    };
  }

  const validAlignments = ['left', 'right', 'top', 'bottom', 'center-x', 'center-y'];
  if (!validAlignments.includes(action.alignment)) {
    return {
      success: false,
      action,
      error: `Invalid alignment type. Must be one of: ${validAlignments.join(', ')}`,
    };
  }

  const { shapes } = useCanvasStore.getState();
  const shapesToAlign = shapes.filter(s => action.shapeIds!.includes(s.id));

  if (shapesToAlign.length === 0) {
    return {
      success: false,
      action,
      error: 'No valid shapes found with provided IDs',
    };
  }

  try {
    let alignmentValue: number;

    switch (action.alignment) {
      case 'left':
        // Align all shapes to the leftmost x position
        alignmentValue = Math.min(...shapesToAlign.map(s => s.x));
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { x: alignmentValue }, userContext.userId)
          )
        );
        break;

      case 'right':
        // Align all shapes to the rightmost x + width position
        alignmentValue = Math.max(...shapesToAlign.map(s => s.x + s.width));
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { x: alignmentValue - shape.width }, userContext.userId)
          )
        );
        break;

      case 'top':
        // Align all shapes to the topmost y position
        alignmentValue = Math.min(...shapesToAlign.map(s => s.y));
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { y: alignmentValue }, userContext.userId)
          )
        );
        break;

      case 'bottom':
        // Align all shapes to the bottommost y + height position
        alignmentValue = Math.max(...shapesToAlign.map(s => s.y + s.height));
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { y: alignmentValue - shape.height }, userContext.userId)
          )
        );
        break;

      case 'center-x':
        // Center all shapes horizontally at the average x center
        const avgCenterX = shapesToAlign.reduce((sum, s) => sum + s.x + s.width / 2, 0) / shapesToAlign.length;
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { x: avgCenterX - shape.width / 2 }, userContext.userId)
          )
        );
        break;

      case 'center-y':
        // Center all shapes vertically at the average y center
        const avgCenterY = shapesToAlign.reduce((sum, s) => sum + s.y + s.height / 2, 0) / shapesToAlign.length;
        await Promise.all(
          shapesToAlign.map(shape =>
            updateShape(shape.id, { y: avgCenterY - shape.height / 2 }, userContext.userId)
          )
        );
        break;
    }

    console.log(`✅ Aligned ${shapesToAlign.length} shapes to ${action.alignment}`);

    return {
      success: true,
      action,
      message: `Aligned ${shapesToAlign.length} shapes to ${action.alignment}`,
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Align failed',
    };
  }
}

/**
 * Execute BULK_CREATE action - High-performance bulk shape creation
 */
async function executeBulkCreate(
  action: CanvasAction,
  userContext: UserContext
): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    const { 
      count = 10, 
      pattern = 'random', 
      shapeType = 'mixed', 
      fill = 'random',
      spacing = 150,
      centerX = 2500,
      centerY = 2500
    } = action;
    
    // Validate count
    if (count < 1 || count > 1000) {
      return {
        success: false,
        action,
        error: 'Bulk create count must be between 1 and 1000',
      };
    }
    
    console.log(`🎨 Bulk creating ${count} shapes with pattern: ${pattern}`);
    
    // Generate shape specifications
    const shapes: Array<{
      x: number;
      y: number;
      type: 'rectangle' | 'circle' | 'triangle';
      color: string;
      createdBy: string;
    }> = [];
    
    const colors = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#3b82f6', '#ef4444', '#22c55e'];
    const types: Array<'rectangle' | 'circle' | 'triangle'> = ['rectangle', 'circle', 'triangle'];
    
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      
      // Position based on pattern
      switch (pattern) {
        case 'grid': {
          const cols = Math.ceil(Math.sqrt(count));
          const col = i % cols;
          const row = Math.floor(i / cols);
          x = 100 + col * spacing;
          y = 100 + row * spacing;
          break;
        }
        case 'horizontal': {
          x = 100 + (i * spacing) % 4800;
          y = centerY;
          break;
        }
        case 'vertical': {
          x = centerX;
          y = 100 + (i * spacing) % 4800;
          break;
        }
        case 'circular': {
          const radius = 1000;
          const angle = (i / count) * 2 * Math.PI;
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
          break;
        }
        default: // random
          x = Math.random() * 4800 + 100;
          y = Math.random() * 4800 + 100;
      }
      
      // Determine type
      const type = shapeType === 'mixed' 
        ? types[Math.floor(Math.random() * types.length)]
        : shapeType as 'rectangle' | 'circle' | 'triangle';
      
      // Determine color
      const color = fill === 'random'
        ? colors[Math.floor(Math.random() * colors.length)]
        : fill;
      
      shapes.push({
        x: Math.max(100, Math.min(4900, x)),
        y: Math.max(100, Math.min(4900, y)),
        type,
        color,
        createdBy: userContext.userId,
      });
    }
    
    // Use batch API for performance
    const shapeIds = await withTimeout(
      createShapeBatch(shapes),
      10000, // 10 second timeout for bulk operations
      'BULK_CREATE'
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ Bulk created ${shapeIds.length} shapes in ${duration}ms`);
    
    return {
      success: true,
      action,
      message: `Created ${shapeIds.length} ${pattern} shapes in ${duration}ms`,
    };
  } catch (error) {
    console.error('❌ Bulk create failed:', error);
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Bulk create failed',
    };
  }
}

/**
 * Execute DELETE_ALL action - Clear entire canvas (admin function)
 */
async function executeDeleteAll(action: CanvasAction): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🗑️ Clearing all shapes from canvas...`);
    
    // Use existing admin clearAllShapes function
    const result = await withTimeout(
      clearAllShapes(),
      10000, // 10 second timeout
      'DELETE_ALL'
    );
    
    if (!result.success) {
      return {
        success: false,
        action,
        error: result.error instanceof Error ? result.error.message : 'Failed to clear canvas',
      };
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Cleared ${result.deletedCount} shapes in ${duration}ms`);
    
    return {
      success: true,
      action,
      message: `Deleted all ${result.deletedCount} shapes from canvas`,
    };
  } catch (error) {
    console.error('❌ Delete all failed:', error);
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Delete all failed',
    };
  }
}

/**
 * Dry run: validate actions without executing
 */
export async function validateActions(
  actions: CanvasAction[],
  _userContext: UserContext
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

      case 'ALIGN':
        if (!action.shapeIds || action.shapeIds.length === 0) {
          errors.push(`Action ${i}: Missing or empty shapeIds`);
        }
        if (!action.alignment) errors.push(`Action ${i}: Missing alignment type`);
        break;

      case 'BULK_CREATE':
        if (typeof action.count !== 'number') {
          errors.push(`Action ${i}: Missing count`);
        } else if (action.count < 1 || action.count > 1000) {
          errors.push(`Action ${i}: count must be between 1 and 1000`);
        }
        break;

      case 'DELETE_ALL':
        // No validation needed - just clears everything
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

