import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function AlertRegistrationForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    latitude: '',
    longitude: '',
    address: '',
    notificationRadius: 10 // Default 10km radius
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const getCurrentLocation = () => {
    setGettingLocation(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }))
        setGettingLocation(false)
      },
      (error) => {
        let message = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enter coordinates manually.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        setError(message)
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!formData.email.includes('@')) return 'Valid email is required'
    if (!formData.phone.trim()) return 'Phone number is required'
    if (!formData.latitude || !formData.longitude) return 'Location is required'
    
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    if (isNaN(lat) || lat < -90 || lat > 90) return 'Valid latitude (-90 to 90) is required'
    if (isNaN(lng) || lng < -180 || lng > 180) return 'Valid longitude (-180 to 180) is required'

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('alert_subscribers')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          address: formData.address.trim() || null,
          notification_radius_km: parseInt(formData.notificationRadius),
          is_active: true,
          created_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      onSuccess?.()
      alert('Successfully registered for emergency alerts! You will receive notifications for alerts within your specified radius.')
      onClose?.()
    } catch (err) {
      console.error('Error registering for alerts:', err)
      if (err.code === '23505') {
        setError('Email already registered. Please use a different email address.')
      } else {
        setError('Failed to register: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ zIndex: 1000000 }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Register for Emergency Alerts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Get notified when emergency alerts are issued in your area. We'll send notifications via email and SMS.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Optional)
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your address"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  step="any"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Latitude"
                  required
                />
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  step="any"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Longitude"
                  required
                />
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                {gettingLocation ? 'Getting Location...' : '📍 Use Current Location'}
              </button>
            </div>

            {/* Notification Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Radius (km)
              </label>
              <select
                name="notificationRadius"
                value={formData.notificationRadius}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                You'll receive alerts for emergencies within this distance from your location.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register for Alerts'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AlertRegistrationForm