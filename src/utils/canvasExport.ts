import Konva from 'konva'

export interface ExportOptions {
  pixelRatio?: number
  mimeType?: string
  quality?: number
  x?: number
  y?: number
  width?: number
  height?: number
}

/**
 * Export the canvas stage as a PNG image
 */
export function exportCanvasAsPNG(
  stage: Konva.Stage,
  filename: string = 'canvas-export.png',
  options: ExportOptions = {}
): void {
  try {
    const {
      pixelRatio = 2, // Higher quality export
      mimeType = 'image/png',
      quality = 1,
      x,
      y,
      width,
      height
    } = options

    // Get the data URL from the stage
    const dataURL = stage.toDataURL({
      pixelRatio,
      mimeType,
      quality,
      x,
      y,
      width,
      height
    })

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.download = filename
    link.href = dataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('✅ Canvas exported as PNG:', filename)
  } catch (error) {
    console.error('❌ Failed to export canvas:', error)
    throw new Error('Failed to export canvas as PNG')
  }
}

/**
 * Export just the visible shapes (trim transparent areas)
 */
export function exportVisibleArea(
  stage: Konva.Stage,
  filename: string = 'canvas-export.png'
): void {
  try {
    // Find the bounding box of all shapes
    const shapes = stage.find('Rect, Line, Circle')
    
    if (shapes.length === 0) {
      alert('No shapes to export!')
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    shapes.forEach((shape) => {
      const box = shape.getClientRect()
      minX = Math.min(minX, box.x)
      minY = Math.min(minY, box.y)
      maxX = Math.max(maxX, box.x + box.width)
      maxY = Math.max(maxY, box.y + box.height)
    })

    // Add some padding
    const padding = 20
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    const width = maxX - minX + padding * 2
    const height = maxY - minY + padding * 2

    exportCanvasAsPNG(stage, filename, {
      x: minX,
      y: minY,
      width,
      height,
      pixelRatio: 2
    })
  } catch (error) {
    console.error('❌ Failed to export visible area:', error)
    alert('Failed to export canvas. Please try again.')
  }
}

/**
 * Copy canvas to clipboard as an image
 */
export async function copyCanvasToClipboard(stage: Konva.Stage): Promise<void> {
  try {
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png'
    })

    // Convert data URL to blob
    const response = await fetch(dataURL)
    const blob = await response.blob()

    // Write to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])

    console.log('✅ Canvas copied to clipboard')
    alert('Canvas copied to clipboard!')
  } catch (error) {
    console.error('❌ Failed to copy to clipboard:', error)
    alert('Failed to copy to clipboard. Your browser may not support this feature.')
  }
}

