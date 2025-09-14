import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { isAdmin, supabase } from '../lib/supabaseClient'

function AlertDetailsModal({ alert, resources, session, onClose, onAlertDeleted }) {
  const [nearbyResources, setNearbyResources] = useState([])
  const [loading, setLoading] = useState(true)

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in kilometers
  }

  // Find nearby resources within 5km
  useEffect(() => {
    if (alert && resources) {
      const nearby = resources
        .map(resource => ({
          ...resource,
          distance: calculateDistance(
            alert.latitude,
            alert.longitude,
            resource.latitude,
            resource.longitude
          )
        }))
        .filter(resource => resource.distance <= 5) // Within 5km
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, 5) // Take top 5 closest
      
      setNearbyResources(nearby)
      setLoading(false)
    }
  }, [alert, resources])

  // Get severity badge styling
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'L5':
        return 'bg-red-600 text-white border-red-600'
      case 'L4':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'L3':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'L2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'L1':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get severity description
  const getSeverityDescription = (severity) => {
    switch (severity) {
      case 'L5':
        return 'Critical - Extreme Impact'
      case 'L4':
        return 'Severe - High Impact'
      case 'L3':
        return 'Significant - Moderate Impact'
      case 'L2':
        return 'Moderate - Limited Impact'
      case 'L1':
        return 'Minor - Low Impact'
      default:
        return 'Unknown severity'
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Delete alert function (admin only)
  const handleDeleteAlert = async () => {
    if (!session || !isAdmin(session.user)) {
      alert('Only administrators can delete alerts')
      return
    }

    if (!confirm('Are you sure you want to delete this alert?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alert.id)

      if (error) throw error

      onClose()
      if (onAlertDeleted) {
        onAlertDeleted() // Refresh the alerts list
      }
    } catch (err) {
      console.error('Error deleting alert:', err)
      alert(`Failed to delete alert: ${err.message}`)
    }
  }

  if (!alert) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Alert Details</h3>
          <div className="flex items-center space-x-2">
            {session && isAdmin(session.user) && (
              <button
                onClick={handleDeleteAlert}
                className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                title="Delete Alert"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Alert Information */}
        <div className="space-y-4">
          {/* Severity and Type */}
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityBadgeClass(alert.severity)}`}>
              {alert.severity}
            </span>
            <span className="text-sm text-gray-600">
              {getSeverityDescription(alert.severity)}
            </span>
            {alert.alert_type && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {alert.alert_type}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
              {alert.description}
            </p>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Location</h4>
            <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-md">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                {parseFloat(alert.latitude).toFixed(6)}, {parseFloat(alert.longitude).toFixed(6)}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Created</h4>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
              {formatDate(alert.created_at)}
            </p>
          </div>

          {/* Nearby Resources */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Nearby Resources (within 5km)</h4>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : nearbyResources.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nearbyResources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div>
                      <p className="font-medium text-blue-900">{resource.name}</p>
                      <p className="text-sm text-blue-700">{resource.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-800">
                        {resource.distance.toFixed(2)} km away
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-md">
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-sm text-gray-600">No resources found within 5km</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AlertDetailsModal