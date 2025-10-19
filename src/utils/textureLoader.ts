/**
 * Texture Loader for ChristmasCanvas
 * 
 * Handles pre-loading and caching of all texture images for instant access.
 * Textures are loaded once on app initialization and stored in memory.
 */

import { getAllTexturePaths } from '../constants/textureManifest';

/**
 * Singleton TextureLoader class
 */
class TextureLoader {
  private loadedTextures: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private isPreloaded = false;

  /**
   * Preload a single texture
   */
  async preloadTexture(texturePath: string): Promise<HTMLImageElement> {
    // Return cached if already loaded
    if (this.loadedTextures.has(texturePath)) {
      return this.loadedTextures.get(texturePath)!;
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(texturePath)) {
      return this.loadingPromises.get(texturePath)!;
    }

    // Create new loading promise
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // For CORS if needed
      
      img.onload = () => {
        this.loadedTextures.set(texturePath, img);
        this.loadingPromises.delete(texturePath);
        console.log(`✅ Texture loaded: ${texturePath} (${img.width}x${img.height})`);
        resolve(img);
      };
      
      img.onerror = (error) => {
        this.loadingPromises.delete(texturePath);
        console.error(`❌ Failed to load texture: ${texturePath}`, error);
        reject(new Error(`Failed to load texture: ${texturePath}`));
      };
      
      // Add cache-busting timestamp to force reload
      const cacheBuster = `?t=${Date.now()}`;
      img.src = texturePath + cacheBuster;
    });

    this.loadingPromises.set(texturePath, loadingPromise);
    return loadingPromise;
  }

  /**
   * Preload all textures from manifest
   */
  async preloadAllTextures(): Promise<void> {
    if (this.isPreloaded) {
      console.log('📦 Textures already preloaded');
      return;
    }

    const texturePaths = getAllTexturePaths();
    console.log(`📦 Preloading ${texturePaths.length} textures...`);

    try {
      await Promise.all(
        texturePaths.map(path => this.preloadTexture(path))
      );
      this.isPreloaded = true;
      console.log(`✅ All textures preloaded successfully (${texturePaths.length} total)`);
    } catch (error) {
      console.error('❌ Error preloading textures:', error);
      // Don't throw - some textures might have loaded
    }
  }

  /**
   * Get a loaded texture (synchronous)
   */
  getTexture(texturePath: string): HTMLImageElement | null {
    return this.loadedTextures.get(texturePath) || null;
  }

  /**
   * Check if texture is loaded
   */
  isTextureLoaded(texturePath: string): boolean {
    return this.loadedTextures.has(texturePath);
  }

  /**
   * Get all loaded texture paths
   */
  getLoadedTexturePaths(): string[] {
    return Array.from(this.loadedTextures.keys());
  }

  /**
   * Clear all cached textures (for cleanup)
   */
  clearCache(): void {
    this.loadedTextures.clear();
    this.loadingPromises.clear();
    this.isPreloaded = false;
  }
}

// Singleton instance
export const textureLoader = new TextureLoader();

// Export preload function for convenience
export async function preloadTextures(): Promise<void> {
  return textureLoader.preloadAllTextures();
}

// Export getter for convenience
export function getTexture(texturePath: string): HTMLImageElement | null {
  return textureLoader.getTexture(texturePath);
}

