import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function AccessibilityPanel({ isOpen, onClose }) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [isColorBlindMode, setIsColorBlindMode] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState('normal')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedZoom = localStorage.getItem('accessibility-zoom')
    const savedColorBlind = localStorage.getItem('accessibility-colorblind')
    const savedContrast = localStorage.getItem('accessibility-contrast')
    const savedFontSize = localStorage.getItem('accessibility-fontsize')
    const savedDarkMode = localStorage.getItem('accessibility-darkmode')

    if (savedZoom) setZoomLevel(parseInt(savedZoom))
    if (savedColorBlind) setIsColorBlindMode(JSON.parse(savedColorBlind))
    if (savedContrast) setHighContrast(JSON.parse(savedContrast))
    if (savedFontSize) setFontSize(savedFontSize)
    if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode))
  }, [])

  // Apply zoom level to document
  useEffect(() => {
    document.documentElement.style.zoom = `${zoomLevel}%`
    localStorage.setItem('accessibility-zoom', zoomLevel.toString())
  }, [zoomLevel])

  // Apply color blind mode
  useEffect(() => {
    const root = document.documentElement
    if (isColorBlindMode) {
      root.classList.add('colorblind-mode')
    } else {
      root.classList.remove('colorblind-mode')
    }
    localStorage.setItem('accessibility-colorblind', JSON.stringify(isColorBlindMode))
  }, [isColorBlindMode])

  // Apply high contrast mode
  useEffect(() => {
    const root = document.documentElement
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    localStorage.setItem('accessibility-contrast', JSON.stringify(highContrast))
  }, [highContrast])

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('accessibility-darkmode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  // Apply font size
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-small', 'font-normal', 'font-large', 'font-xlarge')
    root.classList.add(`font-${fontSize}`)
    localStorage.setItem('accessibility-fontsize', fontSize)
  }, [fontSize])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
      
      // Handle keyboard shortcuts
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
        // Keyboard shortcuts for zoom
        if (e.ctrlKey || e.metaKey) {
          if (e.key === '+' || e.key === '=') {
            e.preventDefault()
            handleZoomChange(10)
          } else if (e.key === '-') {
            e.preventDefault()
            handleZoomChange(-10)
          } else if (e.key === '0') {
            e.preventDefault()
            setZoomLevel(100)
          }
        }
      }
      
      document.addEventListener('keydown', handleKeyPress)
      
      return () => {
        document.body.classList.remove('modal-open')
        document.removeEventListener('keydown', handleKeyPress)
      }
    }
  }, [isOpen, zoomLevel])

  const handleZoomChange = (delta) => {
    const newZoom = Math.max(50, Math.min(200, zoomLevel + delta))
    setZoomLevel(newZoom)
  }

  const resetSettings = () => {
    setZoomLevel(100)
    setIsColorBlindMode(false)
    setHighContrast(false)
    setFontSize('normal')
    setIsDarkMode(false)
    localStorage.removeItem('accessibility-zoom')
    localStorage.removeItem('accessibility-colorblind')
    localStorage.removeItem('accessibility-contrast')
    localStorage.removeItem('accessibility-fontsize')
    localStorage.removeItem('accessibility-darkmode')
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="accessibility-title" className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Accessibility Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close accessibility settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Zoom Control */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Page Zoom
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleZoomChange(-10)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={zoomLevel <= 50}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-medium">{zoomLevel}%</span>
                <div className="text-xs text-gray-500 mt-1">
                  {zoomLevel < 100 ? 'Zoomed Out' : zoomLevel > 100 ? 'Zoomed In' : 'Normal'}
                </div>
              </div>
              <button
                onClick={() => handleZoomChange(10)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={zoomLevel >= 200}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setZoomLevel(75)}
                className="flex-1 py-1 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                75%
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="flex-1 py-1 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                100%
              </button>
              <button
                onClick={() => setZoomLevel(125)}
                className="flex-1 py-1 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                125%
              </button>
              <button
                onClick={() => setZoomLevel(150)}
                className="flex-1 py-1 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                150%
              </button>
            </div>
          </div>

          {/* Font Size Control */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Text Size
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {['small', 'normal', 'large', 'xlarge'].map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`py-2 px-3 text-xs rounded transition-colors ${
                    fontSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {size === 'xlarge' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color Blind Mode */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visual Assistance
            </h3>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isColorBlindMode}
                onChange={(e) => setIsColorBlindMode(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Color Blind Friendly Mode</span>
                <p className="text-xs text-gray-500">Uses patterns and shapes instead of colors only</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">High Contrast Mode</span>
                <p className="text-xs text-gray-500">Increases contrast for better visibility</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={(e) => setIsDarkMode(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 flex items-center">
                  {isDarkMode ? (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  Dark Mode
                </span>
                <p className="text-xs text-gray-500">Reduces eye strain in low light conditions</p>
              </div>
            </label>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={resetSettings}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Default
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center mb-2">
            Settings are automatically saved and will persist across sessions
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Alt + A</kbd> Open accessibility panel</p>
            <p><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Alt + D</kbd> Toggle dark mode</p>
            <p><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl/Cmd + +</kbd> Zoom in</p>
            <p><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl/Cmd + -</kbd> Zoom out</p>
            <p><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl/Cmd + 0</kbd> Reset zoom</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AccessibilityPanel