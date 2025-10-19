/**
 * Texture Manifest for ChristmasCanvas
 * 
 * Centralized registry of all available textures organized by type.
 * Paths are relative to /public directory.
 */

export const TEXTURES = {
  trees: [
    '/textures/trees/pine1.png',
    '/textures/trees/pine2.jpg',
  ],
  trunks: [
    '/textures/trunks/bark1.png',
    '/textures/trunks/bark3.jpg',
  ],
  ornaments: [
    '/textures/ornaments/ornament1.jpg',
  ],
  gifts: [
    '/textures/gifts/gift1.jpg',
    '/textures/gifts/gift2.jpg',
    '/textures/gifts/gift3.jpg',
  ]
} as const;

/**
 * Get a random texture from a category
 */
export function getRandomTexture(category: keyof typeof TEXTURES): string {
  const textures = TEXTURES[category];
  if (!textures || textures.length === 0) {
    throw new Error(`No textures available for category: ${category}`);
  }
  return textures[Math.floor(Math.random() * textures.length)];
}

/**
 * Get all texture paths (for preloading)
 */
export function getAllTexturePaths(): string[] {
  return Object.values(TEXTURES).flat();
}

/**
 * Texture category mapping for shape types
 * Used by Santa's Magic to determine which texture to apply
 */
export const SHAPE_TO_TEXTURE: Record<string, keyof typeof TEXTURES> = {
  triangle: 'trees',     // Triangles become pine trees
  rectangle: 'gifts',    // Rectangles become gift boxes
  circle: 'ornaments',   // Circles become ornaments
};

/**
 * Get appropriate texture category for a shape type
 */
export function getTextureCategoryForShape(shapeType: 'rectangle' | 'circle' | 'triangle'): keyof typeof TEXTURES {
  return SHAPE_TO_TEXTURE[shapeType] || 'trees';
}

