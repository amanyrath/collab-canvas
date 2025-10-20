import { useState, useMemo } from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useUserStore } from '../../store/userStore'
import { Shape } from '../../utils/types'
import { updateShape, deleteShape, updateShapeBatch } from '../../utils/shapeUtils'

interface LayerGroup {
  zIndex: number
  shapes: Shape[]
  isExpanded: boolean
}

export default function LayersPanel() {
  const shapes = useCanvasStore((state) => state.shapes)
  const updateShapeOptimistic = useCanvasStore((state) => state.updateShapeOptimistic)
  const batchUpdateShapesOptimistic = useCanvasStore((state) => state.batchUpdateShapesOptimistic)
  const deleteShapeFromStore = useCanvasStore((state) => state.deleteShape)
  const bringToFront = useCanvasStore((state) => state.bringToFront)
  const sendToBack = useCanvasStore((state) => state.sendToBack)
  const user = useUserStore((state) => state.user)
  
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set())

  // Group shapes by layer (zIndex)
  const layerGroups = useMemo(() => {
    const groups = new Map<number, Shape[]>()
    
    shapes.forEach(shape => {
      const zIndex = shape.zIndex ?? 0
      if (!groups.has(zIndex)) {
        groups.set(zIndex, [])
      }
      groups.get(zIndex)!.push(shape)
    })
    
    // Convert to sorted array (highest layer first)
    return Array.from(groups.entries())
      .map(([zIndex, shapes]) => ({
        zIndex,
        shapes,
        isExpanded: expandedLayers.has(zIndex)
      }))
      .sort((a, b) => b.zIndex - a.zIndex)
  }, [shapes, expandedLayers])

  const toggleLayerExpanded = (zIndex: number) => {
    setExpandedLayers(prev => {
      const next = new Set(prev)
      if (next.has(zIndex)) {
        next.delete(zIndex)
      } else {
        next.add(zIndex)
      }
      return next
    })
  }

  const handleSelectLayer = async (zIndex: number) => {
    if (!user) return
    
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    const otherShapes = shapes.filter(s => (s.zIndex ?? 0) !== zIndex && s.lockedBy === user.uid)
    
    // Batch update: unlock others, lock this layer's shapes
    const updates = [
      ...otherShapes.map(s => ({
        shapeId: s.id,
        updates: {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null
        }
      })),
      ...layerShapes.map(s => ({
        shapeId: s.id,
        updates: {
          isLocked: true,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByColor: user.cursorColor,
        }
      }))
    ]
    
    batchUpdateShapesOptimistic(updates)
    
    // Sync to Firebase
    await updateShapeBatch([
      ...otherShapes.map(s => ({
        shapeId: s.id,
        updates: {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null
        } as Partial<Shape>,
        userId: user.uid
      })),
      ...layerShapes.map(s => ({
        shapeId: s.id,
        updates: {
          isLocked: true,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByColor: user.cursorColor,
        } as Partial<Shape>,
        userId: user.uid
      }))
    ])
  }

  const handleSelectShape = async (shapeId: string, event: React.MouseEvent) => {
    if (!user) return
    
    const isShiftClick = event.shiftKey
    const shape = shapes.find(s => s.id === shapeId)
    if (!shape) return
    
    if (isShiftClick) {
      // Toggle this shape
      if (shape.lockedBy === user.uid) {
        updateShapeOptimistic(shapeId, {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null,
        })
        await updateShape(shapeId, {
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedByColor: null,
        }, user.uid)
      } else {
        updateShapeOptimistic(shapeId, {
          isLocked: true,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByColor: user.cursorColor,
        })
        await updateShape(shapeId, {
          isLocked: true,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByColor: user.cursorColor,
        }, user.uid)
      }
    } else {
      // Select only this shape
      const otherLocked = shapes.filter(s => s.id !== shapeId && s.lockedBy === user.uid)
      
      const updates = [
        ...otherLocked.map(s => ({
          shapeId: s.id,
          updates: {
            isLocked: false,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null
          }
        })),
        {
          shapeId,
          updates: {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor,
          }
        }
      ]
      
      batchUpdateShapesOptimistic(updates)
      
      await updateShapeBatch([
        ...otherLocked.map(s => ({
          shapeId: s.id,
          updates: {
            isLocked: false,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null
          } as Partial<Shape>,
          userId: user.uid
        })),
        {
          shapeId,
          updates: {
            isLocked: true,
            lockedBy: user.uid,
            lockedByName: user.displayName,
            lockedByColor: user.cursorColor,
          } as Partial<Shape>,
          userId: user.uid
        }
      ])
    }
  }

  const handleDeleteShape = async (shapeId: string) => {
    deleteShapeFromStore(shapeId)
    await deleteShape(shapeId)
  }

  const handleToggleVisibility = async (shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId)
    if (!shape || !user) return

    const isHidden = (shape as any).hidden
    updateShapeOptimistic(shapeId, { hidden: !isHidden } as any)
    await updateShape(shapeId, { hidden: !isHidden } as any, user.uid)
  }

  const handleMoveLayerUp = async (zIndex: number) => {
    if (!user) return
    
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    const newZIndex = zIndex + 1
    
    layerShapes.forEach(shape => {
      bringToFront(shape.id)
      updateShape(shape.id, { zIndex: newZIndex }, user.uid)
    })
  }

  const handleMoveLayerDown = async (zIndex: number) => {
    if (!user) return
    
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    const newZIndex = zIndex - 1
    
    layerShapes.forEach(shape => {
      sendToBack(shape.id)
      updateShape(shape.id, { zIndex: newZIndex }, user.uid)
    })
  }

  const handleDeleteLayer = async (zIndex: number) => {
    if (!confirm(`Delete all shapes in Layer ${zIndex + 1}?`)) return
    
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    
    layerShapes.forEach(shape => {
      deleteShapeFromStore(shape.id)
      deleteShape(shape.id)
    })
  }

  const getShapeIcon = (type: string) => {
    switch (type) {
      case 'rectangle': return '▢'
      case 'circle': return '○'
      case 'triangle': return '△'
      default: return '●'
    }
  }

  const getShapeName = (shape: Shape) => {
    if (shape.text) {
      return `${shape.type} - "${shape.text.substring(0, 12)}${shape.text.length > 12 ? '...' : ''}"`
    }
    return shape.type.charAt(0).toUpperCase() + shape.type.slice(1)
  }

  const isLayerSelected = (zIndex: number) => {
    if (!user) return false
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    return layerShapes.length > 0 && layerShapes.every(s => s.lockedBy === user.uid)
  }

  const hasSelectedShapesInLayer = (zIndex: number) => {
    if (!user) return false
    const layerShapes = shapes.filter(s => (s.zIndex ?? 0) === zIndex)
    return layerShapes.some(s => s.lockedBy === user.uid)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Layers</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {layerGroups.length} {layerGroups.length === 1 ? 'layer' : 'layers'} • {shapes.length} shapes
        </p>
      </div>

      {/* Layers list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {layerGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📐</div>
            <p className="text-sm">No layers yet</p>
            <p className="text-xs">Click on the canvas to add shapes</p>
          </div>
        ) : (
          layerGroups.map((layer) => {
            const isSelected = isLayerSelected(layer.zIndex)
            const hasSelection = hasSelectedShapesInLayer(layer.zIndex)
            
            return (
              <div
                key={layer.zIndex}
                className={`
                  rounded-lg border transition-all
                  ${isSelected ? 'bg-blue-50 border-blue-400' : hasSelection ? 'bg-blue-25 border-blue-200' : 'bg-white border-gray-200'}
                `}
              >
                {/* Layer header */}
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                  {/* Expand/collapse button */}
                  <button
                    onClick={() => toggleLayerExpanded(layer.zIndex)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {layer.isExpanded ? '▼' : '▶'}
                  </button>

                  {/* Layer icon */}
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center text-xs font-bold text-blue-700">
                    {layer.zIndex + 1}
                  </div>

                  {/* Layer info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleSelectLayer(layer.zIndex)}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      Layer {layer.zIndex + 1}
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.shapes.length} {layer.shapes.length === 1 ? 'shape' : 'shapes'}
                    </div>
                  </div>

                  {/* Layer actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveLayerUp(layer.zIndex)}
                      className="p-1 hover:bg-gray-100 rounded text-xs"
                      title="Move layer up"
                    >
                      ⬆️
                    </button>
                    <button
                      onClick={() => handleMoveLayerDown(layer.zIndex)}
                      className="p-1 hover:bg-gray-100 rounded text-xs"
                      title="Move layer down"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => handleDeleteLayer(layer.zIndex)}
                      className="p-1 hover:bg-red-100 rounded text-red-600 text-xs"
                      title="Delete layer"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Expanded shapes */}
                {layer.isExpanded && (
                  <div className="border-t border-gray-100 px-3 py-2 space-y-1 bg-gray-50">
                    {layer.shapes.map((shape) => {
                      const isShapeSelected = shape.lockedBy === user?.uid
                      const isLockedByOther = shape.isLocked && shape.lockedBy !== user?.uid

                      return (
                        <div
                          key={shape.id}
                          className={`
                            flex items-center gap-2 px-2 py-1 rounded text-xs
                            ${isShapeSelected ? 'bg-blue-100' : 'hover:bg-white'}
                          `}
                        >
                          {/* Shape icon */}
                          <div style={{ color: shape.fill }}>
                            {getShapeIcon(shape.type)}
                          </div>

                          {/* Shape name */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer truncate"
                            onClick={(e) => handleSelectShape(shape.id, e)}
                          >
                            {getShapeName(shape)}
                          </div>

                          {/* Shape actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleToggleVisibility(shape.id)}
                              className="p-0.5 hover:bg-gray-200 rounded"
                              title={(shape as any).hidden ? 'Show' : 'Hide'}
                            >
                              {(shape as any).hidden ? '👁‍🗨' : '👁'}
                            </button>
                            <button
                              onClick={() => handleDeleteShape(shape.id)}
                              className="p-0.5 hover:bg-red-200 rounded text-red-600"
                              title="Delete"
                              disabled={isLockedByOther}
                            >
                              ×
                            </button>
                          </div>

                          {/* Lock indicator */}
                          {isLockedByOther && (
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: shape.lockedByColor || '#666' }}
                              title={`Locked by ${shape.lockedByName}`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer with info */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          💡 Click layer to select all • Expand to see shapes
        </p>
      </div>
    </div>
  )
}
