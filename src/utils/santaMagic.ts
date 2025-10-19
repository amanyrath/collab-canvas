/**
 * Santa's Magic - ChristmasCanvas Core Feature
 * 
 * Applies Christmas textures to all shapes.
 * Treated exactly like changing shape colors - simple property update synced to Firebase.
 */

import { Shape } from './types';
import { TEXTURES } from '../constants/textureManifest';
import { updateShapeBatch } from './shapeUtils';
import { useCanvasStore } from '../store/canvasStore';

/**
 * Apply Christmas textures to all shapes
 * 
 * @param shapes - All shapes currently on the canvas
 * @param userId - ID of user applying the magic
 * @returns Result with count of transformed shapes
 */
export async function applySantaMagic(
  shapes: Shape[],
  userId: string
): Promise<{ transformedCount: number }> {
  console.log('🎅 Applying Santa\'s Magic to', shapes.length, 'shapes...');

  // Prepare batch updates for all shapes
  const batchUpdates: Array<{ shapeId: string; updates: Partial<Shape> }> = [];
  const firebaseUpdates: Array<{ shapeId: string; updates: Partial<Shape>; userId: string }> = [];

  for (const shape of shapes) {
    // Get random texture based on shape type
    let texturePath: string;
    
    switch (shape.type) {
      case 'rectangle':
        // Rectangles become gift boxes
        const giftTextures = TEXTURES.gifts;
        texturePath = giftTextures[Math.floor(Math.random() * giftTextures.length)];
        break;
      case 'triangle':
        // Triangles become pine trees
        const treeTextures = TEXTURES.trees;
        texturePath = treeTextures[Math.floor(Math.random() * treeTextures.length)];
        break;
      case 'circle':
        // Circles become ornaments
        const ornamentTextures = TEXTURES.ornaments;
        texturePath = ornamentTextures[Math.floor(Math.random() * ornamentTextures.length)];
        break;
      default:
        continue;
    }

    const textureUpdate = { texture: texturePath };
    batchUpdates.push({ shapeId: shape.id, updates: textureUpdate });
    firebaseUpdates.push({ shapeId: shape.id, updates: textureUpdate, userId });
  }

  console.log(`🎨 Applying textures to ${batchUpdates.length} shapes in batch...`);

  // 1️⃣ Update UI instantly (optimistic update)
  const { batchUpdateShapesOptimistic } = useCanvasStore.getState();
  batchUpdateShapesOptimistic(batchUpdates);

  // 2️⃣ Sync to Firebase in background (batched for efficiency)
  try {
    await updateShapeBatch(firebaseUpdates);
    console.log(`✅ Santa's Magic complete! Transformed: ${batchUpdates.length} shapes`);
  } catch (error) {
    console.error('❌ Failed to sync Santa\'s Magic to Firebase:', error);
    // UI already updated, so partial success
  }
  
  return { transformedCount: batchUpdates.length };
}

/**
 * Remove Christmas theme from all shapes (undo magic)
 * 
 * @param shapes - All shapes to un-theme
 * @param userId - ID of user removing the theme
 */
export async function removeSantaMagic(
  shapes: Shape[],
  userId: string
): Promise<{ unthemedCount: number }> {
  console.log('🔙 Removing Christmas theme from', shapes.length, 'shapes...');

  // Filter shapes that have textures and prepare batch updates
  const shapesWithTextures = shapes.filter(shape => shape.texture);
  const batchUpdates: Array<{ shapeId: string; updates: Partial<Shape> }> = [];
  const firebaseUpdates: Array<{ shapeId: string; updates: Partial<Shape>; userId: string }> = [];

  for (const shape of shapesWithTextures) {
    const textureUpdate = { texture: undefined };
    batchUpdates.push({ shapeId: shape.id, updates: textureUpdate });
    firebaseUpdates.push({ shapeId: shape.id, updates: textureUpdate, userId });
  }

  if (batchUpdates.length === 0) {
    console.log('✅ No textures to remove');
    return { unthemedCount: 0 };
  }

  console.log(`🔙 Removing textures from ${batchUpdates.length} shapes in batch...`);

  // 1️⃣ Update UI instantly (optimistic update)
  const { batchUpdateShapesOptimistic } = useCanvasStore.getState();
  batchUpdateShapesOptimistic(batchUpdates);

  // 2️⃣ Sync to Firebase in background (batched for efficiency)
  try {
    await updateShapeBatch(firebaseUpdates);
    console.log(`✅ Theme removed from ${batchUpdates.length} shapes`);
  } catch (error) {
    console.error('❌ Failed to sync theme removal to Firebase:', error);
    // UI already updated, so partial success
  }

  return { unthemedCount: batchUpdates.length };
}

/**
 * Check if a shape is positioned like a tree trunk
 * (rectangle positioned below a triangle)
 * 
 * @param shape - The rectangle to check
 * @param allShapes - All shapes on canvas
 * @returns true if positioned as a trunk
 */
export function isPositionedAsTrunk(shape: Shape, allShapes: Shape[]): boolean {
  if (shape.type !== 'rectangle') return false;

  // Find triangles that are above this rectangle
  const trianglesAbove = allShapes.filter(s => 
    s.type === 'triangle' &&
    s.y + s.height <= shape.y + 20 && // Triangle bottom near rectangle top
    Math.abs((s.x + s.width / 2) - (shape.x + shape.width / 2)) < 50 // Horizontally aligned
  );

  return trianglesAbove.length > 0;
}

