import { useState, useEffect } from 'react'

const RECENT_COLORS_KEY = 'collabcanvas-recent-colors'
const SAVED_PALETTES_KEY = 'collabcanvas-saved-palettes'
const MAX_RECENT_COLORS = 12

export interface SavedPalette {
  id: string
  name: string
  colors: string[]
  createdAt: number
}

export function useColorHistory() {
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem(RECENT_COLORS_KEY)
      if (storedRecent) {
        setRecentColors(JSON.parse(storedRecent))
      }

      const storedPalettes = localStorage.getItem(SAVED_PALETTES_KEY)
      if (storedPalettes) {
        setSavedPalettes(JSON.parse(storedPalettes))
      }
    } catch (error) {
      console.error('Error loading color history:', error)
    }
  }, [])

  const addRecentColor = (color: string) => {
    const normalizedColor = color.toLowerCase()
    
    setRecentColors(prev => {
      // Remove if already exists
      const filtered = prev.filter(c => c !== normalizedColor)
      // Add to front
      const updated = [normalizedColor, ...filtered].slice(0, MAX_RECENT_COLORS)
      
      // Save to localStorage
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving recent colors:', error)
      }
      
      return updated
    })
  }

  const clearRecentColors = () => {
    setRecentColors([])
    try {
      localStorage.removeItem(RECENT_COLORS_KEY)
    } catch (error) {
      console.error('Error clearing recent colors:', error)
    }
  }

  const savePalette = (name: string, colors: string[]) => {
    const palette: SavedPalette = {
      id: Date.now().toString(),
      name,
      colors,
      createdAt: Date.now()
    }

    setSavedPalettes(prev => {
      const updated = [palette, ...prev]
      
      // Save to localStorage
      try {
        localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving palette:', error)
      }
      
      return updated
    })

    return palette
  }

  const deletePalette = (id: string) => {
    setSavedPalettes(prev => {
      const updated = prev.filter(p => p.id !== id)
      
      // Save to localStorage
      try {
        localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error deleting palette:', error)
      }
      
      return updated
    })
  }

  const updatePalette = (id: string, name: string, colors: string[]) => {
    setSavedPalettes(prev => {
      const updated = prev.map(p => 
        p.id === id 
          ? { ...p, name, colors } 
          : p
      )
      
      // Save to localStorage
      try {
        localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error updating palette:', error)
      }
      
      return updated
    })
  }

  return {
    recentColors,
    savedPalettes,
    addRecentColor,
    clearRecentColors,
    savePalette,
    deletePalette,
    updatePalette
  }
}

