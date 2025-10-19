/**
 * Santa's Magic - ChristmasCanvas Core Feature
 * 
 * Applies Christmas textures to all shapes.
 * Treated exactly like changing shape colors - simple property update synced to Firebase.
 */

import { Shape } from './types';
import { TEXTURES } from '../constants/textureManifest';
import { updateShape } from './shapeUtils';

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

  let transformedCount = 0;

  // Update all shapes with Christmas textures
  const updatePromises = shapes.map(async (shape) => {
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
        return;
    }

    console.log(`🎨 Applying texture to ${shape.type} (${shape.id.slice(-6)}): ${texturePath}`);

    // Update Firebase - just like changing color!
    await updateShape(
      shape.id,
      { texture: texturePath },
      userId
    );

    transformedCount++;
  });

  await Promise.all(updatePromises);

  console.log(`✅ Santa's Magic complete! Transformed: ${transformedCount} shapes`);
  
  return { transformedCount };
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

  let unthemedCount = 0;

  const updatePromises = shapes
    .filter(shape => shape.isChristmasThemed)
    .map(async (shape) => {
      try {
        await updateShape(
          shape.id,
          {
            texture: undefined,
            isChristmasThemed: false,
          },
          userId
        );
        unthemedCount++;
      } catch (error) {
        console.error(`❌ Failed to untheme shape ${shape.id}:`, error);
      }
    });

  await Promise.all(updatePromises);

  console.log(`✅ Theme removed from ${unthemedCount} shapes`);

  return { unthemedCount };
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

