import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { isAdmin } from '../lib/supabaseClient'
import AlertDetailsModal from './AlertDetailsModal'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom red icon for alerts
const alertIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Severity-based icons for alerts
const severityIcons = {
  L5: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  L4: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  L3: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  L2: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  L1: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  })
}

// Custom blue icon for resources
const resourceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function MapComponent({ alerts, resources, session, onCreateAlert, onCreateResource, onAlertDeleted, focusAlert }) {
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const mapRef = useRef(null)

  // Effect to focus on alert when focusAlert prop changes
  useEffect(() => {
    if (focusAlert && mapRef.current) {
      const map = mapRef.current
      // Pan to the alert location and zoom in
      map.setView([focusAlert.latitude, focusAlert.longitude], 16, {
        animate: true,
        duration: 1.0
      })
      // Optionally open the alert details modal
      setSelectedAlert(focusAlert)
    }
  }, [focusAlert])

  // Map click handler component
  function MapClickHandler() {
    const map = useMapEvents({
      click(e) {
        console.log('Map clicked:', e.latlng, 'Session:', session, 'Is Admin:', session && isAdmin(session.user))
        
        // Only show context menu for admin users
        const allowClick = session && isAdmin(session.user)
        
        // Only show context menu for admin users
        if (!allowClick) {
          console.log('Not admin, ignoring click')
          return
        }

        const { lat, lng } = e.latlng
        
        // Use the original DOM event to get proper screen coordinates
        const originalEvent = e.originalEvent
        const clientX = originalEvent.clientX
        const clientY = originalEvent.clientY
        
        console.log('Setting context menu:', { lat, lng, x: clientX, y: clientY })
        
        setContextMenu({
          lat: lat,
          lng: lng,
          x: clientX,
          y: clientY
        })
      }
    })
    
    // Store map reference
    useEffect(() => {
      mapRef.current = map
    }, [map])
    
    return null
  }

  // Handle context menu actions
  const handleCreateAlert = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Creating alert at:', contextMenu)
    if (contextMenu && onCreateAlert) {
      onCreateAlert(contextMenu.lat, contextMenu.lng)
    }
    setContextMenu(null)
  }

  const handleCreateResource = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Creating resource at:', contextMenu)
    if (contextMenu && onCreateResource) {
      onCreateResource(contextMenu.lat, contextMenu.lng)
    }
    setContextMenu(null)
  }

  const handleCloseContextMenu = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setContextMenu(null)
  }

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
  // Default center (you can adjust this to your area)
  const defaultCenter = [13.0827, 80.2707] // Chennai, India coordinates
  const defaultZoom = 11

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={true}
      >
        {/* Map click handler for admin users */}
        <MapClickHandler />
        
        {/* Map tiles from OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Alert Markers */}
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.latitude, alert.longitude]}
            icon={severityIcons[alert.severity] || alertIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-red-600">Emergency Alert</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityBadgeClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  {alert.alert_type && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {alert.alert_type}
                    </span>
                  )}
                  {alert.status && alert.status !== 'active' && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.status === 'responded' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {alert.status === 'responded' ? 'Being Responded To' : 'Resolved'}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{alert.description}</p>
                <div className="text-xs text-gray-500 mb-2">
                  <p>Coordinates: {alert.latitude}, {alert.longitude}</p>
                  <p>Created: {formatDate(alert.created_at)}</p>
                </div>
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="w-full mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Resource Markers */}
        {resources.map((resource) => (
          <Marker
            key={resource.id}
            position={[resource.latitude, resource.longitude]}
            icon={resourceIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-600">{resource.name}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    {resource.type}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Coordinates: {resource.latitude}, {resource.longitude}</p>
                  <p>Type: {resource.type}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Context Menu for Admin Actions */}
      {contextMenu && (
        <>
          {/* Backdrop to close context menu */}
          <div 
            className="fixed inset-0"
            style={{ zIndex: 999997 }}
            onClick={handleCloseContextMenu}
          />
          
          {/* Click location indicator */}
          <div
            className="fixed w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `${contextMenu.x - 6}px`,
              top: `${contextMenu.y - 6}px`,
              zIndex: 999999
            }}
          />
          
          {/* Context Menu */}
          <div 
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[180px]"
            style={{
              left: `${Math.max(10, Math.min(contextMenu.x + 10, window.innerWidth - 200))}px`,
              top: `${contextMenu.y + 150 > window.innerHeight 
                ? Math.max(10, contextMenu.y - 120) 
                : Math.max(10, contextMenu.y + 10)}px`,
              zIndex: 999998
            }}
          >
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              Create at: {contextMenu.lat.toFixed(4)}, {contextMenu.lng.toFixed(4)}
            </div>
            
            <button
              onClick={handleCreateAlert}
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-sm text-gray-700 hover:text-red-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Create Emergency Alert
            </button>
            
            <button
              onClick={handleCreateResource}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Create Resource
            </button>
          </div>
        </>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Emergency Alerts</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Resources</span>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="absolute top-4 right-4 bg-green-100 border border-green-200 rounded-lg p-2 z-[1000]">
        <div className="flex items-center text-green-700 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
          <span>Live Updates</span>
        </div>
      </div>

      {/* Admin Instructions */}
      {session && isAdmin(session.user) && (
        <div className="absolute top-16 right-4 bg-blue-100 border border-blue-200 rounded-lg p-2 z-[1000] max-w-xs">
          <div className="flex items-start text-blue-700 text-xs">
            <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Click anywhere on the map to create alerts or resources</span>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          resources={resources}
          session={session}
          onClose={() => setSelectedAlert(null)}
          onAlertDeleted={onAlertDeleted}
        />
      )}
    </div>
  )
}

export default MapComponent