import React, { useEffect } from 'react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = [
    {
      category: 'Create & Edit',
      items: [
        { keys: 'Click empty space', action: 'Create rectangle' },
        { keys: 'R', action: 'Rectangle tool' },
        { keys: 'C', action: 'Circle tool' },
        { keys: '1-4', action: 'Change color (Gray, Red, Green, Blue)' },
      ]
    },
    {
      category: 'Selection',
      items: [
        { keys: 'Click shape', action: 'Select/lock shape' },
        { keys: 'Shift + Click', action: 'Multi-select shapes' },
        { keys: 'Shift + Drag', action: 'Area select (marquee)' },
        { keys: '⌘/Ctrl + A', action: 'Select all shapes' },
        { keys: 'Click background', action: 'Deselect all' },
      ]
    },
    {
      category: 'Transform',
      items: [
        { keys: 'Drag shape', action: 'Move shape' },
        { keys: 'Drag handles', action: 'Resize shape' },
        { keys: 'Shift + Resize', action: 'Lock aspect ratio' },
        { keys: 'Delete', action: 'Delete selected shapes' },
      ]
    },
    {
      category: 'Navigation',
      items: [
        { keys: 'Trackpad scroll', action: 'Pan canvas' },
        { keys: 'Mouse wheel', action: 'Zoom in/out' },
        { keys: '⌘/Ctrl + Scroll', action: 'Zoom in/out' },
        { keys: 'Space + Drag', action: 'Pan canvas (power user)' },
        { keys: 'Pinch', action: 'Zoom in/out' },
      ]
    },
  ]

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <p className="text-sm text-gray-500 mt-1">Press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs">?</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs">Esc</kbd> to close</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-600">{item.action}</span>
                    <kbd className="px-3 py-1 bg-gray-100 rounded border border-gray-300 text-xs font-mono text-gray-700">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: All changes sync in real-time with other users
          </p>
        </div>
      </div>
    </div>
  )
}


