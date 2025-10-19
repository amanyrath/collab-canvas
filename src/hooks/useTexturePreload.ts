/**
 * Hook to preload textures and trigger re-render when complete
 */

import { useState, useEffect } from 'react';
import { preloadTextures } from '../utils/textureLoader';

export function useTexturePreload() {
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎄 Starting texture preload...');
    
    preloadTextures()
      .then(() => {
        console.log('✅ Textures preloaded successfully');
        setTexturesLoaded(true);
      })
      .catch((error) => {
        console.error('❌ Texture preload failed:', error);
        setLoadError(error.message);
      });
  }, []);

  return { texturesLoaded, loadError };
}

