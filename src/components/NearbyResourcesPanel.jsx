import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calculateDistance } from '../lib/locationService'

function NearbyResourcesPanel({ userLocation, onClose }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [radiusFilter, setRadiusFilter] = useState(10) // Default 10km
  const [typeFilter, setTypeFilter] = useState('All')

  const resourceTypes = ['All', 'Hospital', 'Fire Station', 'Police Station', 'Shelter', 'Emergency Center']

  useEffect(() => {
    if (userLocation) {
      fetchNearbyResources()
    }
  }, [userLocation, radiusFilter, typeFilter])

  const fetchNearbyResources = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)

      if (typeFilter !== 'All') {
        query = query.eq('type', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate distances and filter by radius
      const resourcesWithDistance = data
        .map(resource => ({
          ...resource,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            resource.latitude,
            resource.longitude
          )
        }))
        .filter(resource => resource.distance <= radiusFilter)
        .sort((a, b) => a.distance - b.distance)

      setResources(resourcesWithDistance)
    } catch (err) {
      console.error('Error fetching nearby resources:', err)
      setError('Failed to load nearby resources')
    } finally {
      setLoading(false)
    }
  }

  const getResourceIcon = (type) => {
    const icons = {
      'Hospital': '🏥',
      'Fire Station': '🚒',
      'Police Station': '👮',
      'Shelter': '🏠',
      'Emergency Center': '🚨'
    }
    return icons[type] || '📍'
  }

  const getResourceColor = (type) => {
    const colors = {
      'Hospital': 'text-red-600 bg-red-50',
      'Fire Station': 'text-orange-600 bg-orange-50',
      'Police Station': 'text-blue-600 bg-blue-50',
      'Shelter': 'text-green-600 bg-green-50',
      'Emergency Center': 'text-purple-600 bg-purple-50'
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }

  const openInMaps = (resource) => {
    const url = `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${resource.latitude},${resource.longitude}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ zIndex: 1000000 }}>
        {/* Header */}
        <div className="bg-blue-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nearby Emergency Resources</h2>
              <p className="text-sm text-gray-600 mt-1">
                Resources within {radiusFilter}km of your location
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* Filters */}
          <div className="flex space-x-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Distance
              </label>
              <select
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading nearby resources...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchNearbyResources}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : resources.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 mb-2">📍</div>
              <p className="text-gray-600">No {typeFilter.toLowerCase()} resources found within {radiusFilter}km</p>
              <p className="text-sm text-gray-500 mt-1">Try increasing the distance or changing the filter</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">{getResourceIcon(resource.type)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResourceColor(resource.type)}`}>
                            {resource.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium">Distance:</span>
                          <span className="ml-1">{resource.distance.toFixed(1)} km away</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">Location:</span>
                          <span className="ml-1">{resource.latitude.toFixed(4)}, {resource.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openInMaps(resource)}
                      className="ml-4 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Directions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {resources.length} resource{resources.length !== 1 ? 's' : ''} found
            </span>
            <span>
              📍 Your location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NearbyResourcesPanel