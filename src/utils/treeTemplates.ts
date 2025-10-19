/**
 * Christmas Tree Template Generators
 * 
 * Functions to create pre-configured Christmas tree structures
 */

import { Shape } from './types';
import { getRandomTexture } from '../constants/textureManifest';

// Size multipliers for different tree sizes
const SIZE_MULTIPLIERS = {
  small: 0.6,
  medium: 1,
  large: 1.5,
};

/**
 * Generate a unique temporary ID for shapes
 */
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a classic Christmas tree with stacked triangles and trunk
 * 
 * @param centerX - X position for the center of the tree
 * @param centerY - Y position for the base of the tree
 * @param size - Size variant: 'small' | 'medium' | 'large'
 * @param createdBy - User ID creating the tree
 * @returns Array of shape objects (triangles + trunk)
 */
export function createClassicTree(
  centerX: number = 2500,
  centerY: number = 2500,
  size: 'small' | 'medium' | 'large' = 'medium',
  createdBy: string = 'system'
): Partial<Shape>[] {
  const multiplier = SIZE_MULTIPLIERS[size];
  const shapes: Partial<Shape>[] = [];

  // Tree layer definitions (width, height)
  const layers = [
    { width: 200, height: 150 },  // Bottom (layer 0)
    { width: 180, height: 130 },  // Layer 1
    { width: 150, height: 110 },  // Layer 2
    { width: 120, height: 90 },   // Layer 3
    { width: 80, height: 70 }     // Top (layer 4)
  ];

  // Create triangles from bottom to top
  let currentY = centerY;
  layers.forEach((layer, index) => {
    const scaledWidth = layer.width * multiplier;
    const scaledHeight = layer.height * multiplier;
    
    shapes.push({
      id: generateTempId(),
      type: 'triangle',
      x: centerX - scaledWidth / 2, // Center the triangle
      y: currentY - scaledHeight,
      width: scaledWidth,
      height: scaledHeight,
      fill: '#166534', // Dark green (fallback if texture fails)
      text: '',
      textColor: '#ffffff',
      fontSize: 16,
      createdBy,
      isLocked: false,
      lockedBy: null,
      treeLayer: index,
      texture: getRandomTexture('trees'), // 🎄 Pre-apply pine tree texture
    });

    // Overlap layers (70% of height)
    currentY -= scaledHeight * 0.7;
  });

  // Add trunk below the tree
  const trunkWidth = 40 * multiplier;
  const trunkHeight = 80 * multiplier;
  
  shapes.push({
    id: generateTempId(),
    type: 'rectangle',
    x: centerX - trunkWidth / 2,
    y: centerY,
    width: trunkWidth,
    height: trunkHeight,
    fill: '#78350f', // Brown (fallback if texture fails)
    text: '',
    textColor: '#ffffff',
    fontSize: 16,
    createdBy,
    isLocked: false,
    lockedBy: null,
    texture: getRandomTexture('trunks'), // 🎄 Pre-apply bark texture
  });

  console.log(`🎄 Created ${size} Christmas tree with ${shapes.length} shapes at (${centerX}, ${centerY})`);
  
  return shapes;
}

/**
 * Create a decorated Christmas tree (classic tree + ornaments)
 * 
 * @param centerX - X position for the center of the tree
 * @param centerY - Y position for the base of the tree
 * @param size - Size variant
 * @param createdBy - User ID creating the tree
 * @returns Array of shape objects (triangles + trunk + ornament circles)
 */
export function createDecoratedTree(
  centerX: number = 2500,
  centerY: number = 2500,
  size: 'small' | 'medium' | 'large' = 'medium',
  createdBy: string = 'system'
): Partial<Shape>[] {
  // Start with classic tree
  const shapes = createClassicTree(centerX, centerY, size, createdBy);
  
  // Add ornaments (small circles) on the tree
  const multiplier = SIZE_MULTIPLIERS[size];
  const ornamentCount = 10;
  const ornamentRadius = 8 * multiplier;
  
  // Get tree bounds for ornament placement
  const treeWidth = 200 * multiplier;
  const treeHeight = 400 * multiplier;
  
  const ornamentColors = ['#ef4444', '#3b82f6', '#fbbf24', '#8b5cf6', '#ec4899'];
  
  for (let i = 0; i < ornamentCount; i++) {
    // Random position within tree bounds
    const xOffset = (Math.random() - 0.5) * treeWidth * 0.8;
    const yOffset = Math.random() * treeHeight * 0.8;
    
    shapes.push({
      id: generateTempId(),
      type: 'circle',
      x: centerX + xOffset - ornamentRadius,
      y: centerY - yOffset - ornamentRadius,
      width: ornamentRadius * 2,
      height: ornamentRadius * 2,
      fill: ornamentColors[i % ornamentColors.length],
      text: '',
      textColor: '#ffffff',
      fontSize: 12,
      createdBy,
      isLocked: false,
      lockedBy: null,
      texture: getRandomTexture('ornaments'), // 🎄 Pre-apply ornament texture
    });
  }

  // Add star on top (no texture - keep it gold and shiny!)
  shapes.push({
    id: generateTempId(),
    type: 'circle',
    x: centerX - 20 * multiplier,
    y: centerY - treeHeight - 30 * multiplier,
    width: 40 * multiplier,
    height: 40 * multiplier,
    fill: '#fbbf24', // Gold
    text: '★',
    textColor: '#ffffff',
    fontSize: 24,
    createdBy,
    isLocked: false,
    lockedBy: null,
  });

  console.log(`🎄✨ Created decorated Christmas tree with ${shapes.length} shapes`);
  
  return shapes;
}

/**
 * Find available space on canvas to place a tree
 * Simple collision detection to avoid overlaps
 * 
 * @param existingShapes - Current shapes on canvas
 * @param treeWidth - Width of the tree to place
 * @param treeHeight - Height of the tree to place
 * @returns { x, y } coordinates for tree placement
 */
export function findAvailableTreeSpace(
  existingShapes: Shape[],
  treeWidth: number = 200,
  treeHeight: number = 400
): { x: number; y: number } {
  // Start at canvas center
  const centerX = 2500;
  const centerY = 2500;
  
  // Check if center is available
  const hasCollision = existingShapes.some(shape => {
    const treeBounds = {
      left: centerX - treeWidth / 2,
      right: centerX + treeWidth / 2,
      top: centerY - treeHeight,
      bottom: centerY + 80, // Include trunk
    };
    
    const shapeBounds = {
      left: shape.x,
      right: shape.x + shape.width,
      top: shape.y,
      bottom: shape.y + shape.height,
    };
    
    return !(
      treeBounds.right < shapeBounds.left ||
      treeBounds.left > shapeBounds.right ||
      treeBounds.bottom < shapeBounds.top ||
      treeBounds.top > shapeBounds.bottom
    );
  });
  
  if (!hasCollision) {
    return { x: centerX, y: centerY };
  }
  
  // Try offsets in a spiral pattern
  const offsets = [
    { x: 300, y: 0 },
    { x: -300, y: 0 },
    { x: 0, y: 300 },
    { x: 0, y: -300 },
    { x: 300, y: 300 },
    { x: -300, y: -300 },
  ];
  
  for (const offset of offsets) {
    const testX = centerX + offset.x;
    const testY = centerY + offset.y;
    
    const collision = existingShapes.some(shape => {
      const treeBounds = {
        left: testX - treeWidth / 2,
        right: testX + treeWidth / 2,
        top: testY - treeHeight,
        bottom: testY + 80,
      };
      
      const shapeBounds = {
        left: shape.x,
        right: shape.x + shape.width,
        top: shape.y,
        bottom: shape.y + shape.height,
      };
      
      return !(
        treeBounds.right < shapeBounds.left ||
        treeBounds.left > shapeBounds.right ||
        treeBounds.bottom < shapeBounds.top ||
        treeBounds.top > shapeBounds.bottom
      );
    });
    
    if (!collision) {
      return { x: testX, y: testY };
    }
  }
  
  // Fall back to center if no space found
  console.warn('⚠️ No clear space found for tree, placing at center');
  return { x: centerX, y: centerY };
}

