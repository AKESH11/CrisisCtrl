import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'

function CreateAlertModal({ onClose, onAlertCreated, initialCoordinates }) {
  const [formData, setFormData] = useState({
    description: '',
    severity: 'L3',
    alertType: 'Other',
    latitude: initialCoordinates?.lat ? initialCoordinates.lat.toFixed(6) : '',
    longitude: initialCoordinates?.lng ? initialCoordinates.lng.toFixed(6) : ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Validate form data
  const validateForm = () => {
    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Both latitude and longitude are required')
      return false
    }
    
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Latitude and longitude must be valid numbers')
      return false
    }
    
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90')
      return false
    }
    
    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180')
      return false
    }
    
    return true
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Insert new alert into Supabase
      const { data, error } = await supabase
        .from('alerts')
        .insert([
          {
            description: formData.description.trim(),
            severity: formData.severity,
            alert_type: formData.alertType,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude)
          }
        ])
        .select()

      if (error) throw error

      console.log('Alert created successfully:', data)
      
      // Call the callback to notify parent component
      if (onAlertCreated) {
        onAlertCreated()
      }
    } catch (err) {
      console.error('Error creating alert:', err)
      setError(`Failed to create alert: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }))
        setLoading(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('Failed to get current location. Please enter coordinates manually.')
        setLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New Alert</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Alert Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the emergency situation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              required
              disabled={loading}
            />
          </div>

          {/* Severity */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level *
            </label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              disabled={loading}
            >
              <option value="L1">L1 - Minor (Low Impact)</option>
              <option value="L2">L2 - Moderate (Limited Impact)</option>
              <option value="L3">L3 - Significant (Moderate Impact)</option>
              <option value="L4">L4 - Severe (High Impact)</option>
              <option value="L5">L5 - Critical (Extreme Impact)</option>
            </select>
          </div>

          {/* Alert Type */}
          <div>
            <label htmlFor="alertType" className="block text-sm font-medium text-gray-700 mb-1">
              Alert Type *
            </label>
            <select
              id="alertType"
              name="alertType"
              value={formData.alertType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              disabled={loading}
            >
              <option value="Fire">Fire</option>
              <option value="Flood">Flood</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Storm">Storm</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Security Threat">Security Threat</option>
              <option value="Infrastructure Failure">Infrastructure Failure</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Location Coordinates *
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400"
              >
                Use Current Location
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="latitude" className="block text-xs text-gray-500 mb-1">
                  Latitude
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="40.7589"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-xs text-gray-500 mb-1">
                  Longitude
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="-73.9851"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Alert'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default CreateAlertModal