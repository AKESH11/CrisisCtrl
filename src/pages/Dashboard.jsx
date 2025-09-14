import { useState, useEffect } from 'react'
import { supabase, isAdmin, isVolunteer, hasElevatedPermissions } from '../lib/supabaseClient'
import { filterNearbyAlerts, initializeVolunteerLocation, getCurrentLocation } from '../lib/locationService'
import MapComponent from '../components/MapComponent'
import AlertsSidebar from '../components/AlertsSidebar'
import CreateAlertModal from '../components/CreateAlertModal'
import CreateResourceModal from '../components/CreateResourceModal'
import ChatPanel from '../components/ChatPanel'
import AlertRegistrationForm from '../components/AlertRegistrationForm'
import NearbyResourcesPanel from '../components/NearbyResourcesPanel'
import AccessibilityPanel from '../components/AccessibilityPanel'

function Dashboard({ session }) {
  const [alerts, setAlerts] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Volunteer location state
  const [volunteerLocation, setVolunteerLocation] = useState(null)
  const [nearbyAlerts, setNearbyAlerts] = useState([])
  const [locationError, setLocationError] = useState(null)
  
  // Chat state
  const [showChat, setShowChat] = useState(false)
  
  // Modal state for map-based creation
  const [mapCreationModal, setMapCreationModal] = useState(null) // { type: 'alert'|'resource', coordinates: {lat, lng} }
  
  // State for focusing on alert from sidebar
  const [focusAlert, setFocusAlert] = useState(null)

  // Alert registration state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  // Nearby resources state for non-logged users
  const [showNearbyResources, setShowNearbyResources] = useState(false)
  const [publicUserLocation, setPublicUserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Accessibility panel state
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false)

  // Fetch initial data when component mounts
  useEffect(() => {
    fetchInitialData()
    setupRealtimeSubscription()
    
    // Initialize volunteer location if user is a volunteer
    if (session && isVolunteer(session.user)) {
      initializeVolunteerLocationData()
    }

    // Apply saved dark mode on page load
    const savedDarkMode = localStorage.getItem('accessibility-darkmode')
    if (savedDarkMode && JSON.parse(savedDarkMode)) {
      document.documentElement.classList.add('dark')
    }
  }, [session])

  // Global keyboard shortcuts for accessibility
  useEffect(() => {
    const handleGlobalKeyboard = (e) => {
      // Alt + A to open accessibility panel
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        setShowAccessibilityPanel(true)
      }
      // Alt + D to toggle dark mode
      if (e.altKey && e.key === 'd') {
        e.preventDefault()
        const currentDarkMode = localStorage.getItem('accessibility-darkmode')
        const newDarkMode = !JSON.parse(currentDarkMode || 'false')
        
        // Apply dark mode immediately
        const root = document.documentElement
        if (newDarkMode) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
        localStorage.setItem('accessibility-darkmode', JSON.stringify(newDarkMode))
      }
    }

    document.addEventListener('keydown', handleGlobalKeyboard)
    return () => document.removeEventListener('keydown', handleGlobalKeyboard)
  }, [])

  // Initialize volunteer location
  const initializeVolunteerLocationData = async () => {
    try {
      console.log('Initializing volunteer location...')
      setLocationError(null)
      const location = await initializeVolunteerLocation(session.user.id)
      console.log('Volunteer location initialized:', location)
      setVolunteerLocation(location)
    } catch (err) {
      console.error('Error getting volunteer location:', err)
      setLocationError(err.message)
    }
  }

  // Get location for public users to find nearby resources
  const handleFindNearbyResources = async () => {
    setLocationLoading(true)
    try {
      const location = await getCurrentLocation()
      setPublicUserLocation(location)
      setShowNearbyResources(true)
    } catch (err) {
      console.error('Error getting public user location:', err)
      alert('Failed to get location: ' + err.message + '\nPlease enable location access to find nearby resources.')
    } finally {
      setLocationLoading(false)
    }
  }

  // Update nearby alerts when alerts or volunteer location changes
  useEffect(() => {
    if (session && isVolunteer(session.user) && volunteerLocation) {
      const nearby = filterNearbyAlerts(alerts, volunteerLocation, 25) // 25km radius
      setNearbyAlerts(nearby)
    } else {
      setNearbyAlerts([])
    }
  }, [alerts, volunteerLocation, session])

  // Fetch alerts and resources from Supabase
  const fetchInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch alerts and resources in parallel
      const [alertsResponse, resourcesResponse] = await Promise.all([
        supabase
          .from('alerts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('resources')
          .select('*')
          .eq('is_active', true)
      ])

      if (alertsResponse.error) throw alertsResponse.error
      if (resourcesResponse.error) throw resourcesResponse.error

      setAlerts(alertsResponse.data || [])
      setResources(resourcesResponse.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data function
  const refreshData = () => {
    fetchInitialData()
  }

  // Set up real-time subscription for new alerts
  const setupRealtimeSubscription = () => {
    // Subscribe to INSERT events on the alerts table
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('New alert received:', payload.new)
          // Add the new alert to the beginning of the list
          setAlerts(prevAlerts => [payload.new, ...prevAlerts])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('Alert updated:', payload.new)
          // Update the alert in the list
          setAlerts(prevAlerts => 
            prevAlerts.map(alert => 
              alert.id === payload.new.id ? payload.new : alert
            )
          )
        }
      )
      .subscribe()

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error('Error logging out:', err)
      setError('Failed to log out. Please try again.')
    }
  }

  // Handle map-based creation
  const handleMapCreateAlert = (lat, lng) => {
    console.log('Dashboard: Creating alert at', lat, lng)
    setMapCreationModal({
      type: 'alert',
      coordinates: { lat, lng }
    })
  }

  const handleMapCreateResource = (lat, lng) => {
    console.log('Dashboard: Creating resource at', lat, lng)
    setMapCreationModal({
      type: 'resource',
      coordinates: { lat, lng }
    })
  }

  const handleMapModalClose = () => {
    setMapCreationModal(null)
  }

  const handleMapModalCreated = () => {
    setMapCreationModal(null)
    fetchInitialData() // Refresh data
  }

  // Handle alert click from sidebar
  const handleAlertClick = (alert) => {
    console.log('Dashboard: Focusing on alert', alert)
    setFocusAlert(alert)
    // Reset focus after a brief delay to allow for multiple clicks
    setTimeout(() => setFocusAlert(null), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              CrisisCtrl
            </h1>
            <p className="text-sm text-gray-600">
              {session ? (
                <>
                  Welcome, {session.user.email}
                  {isAdmin(session.user) && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                  {isVolunteer(session.user) && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Volunteer
                    </span>
                  )}
                  {isVolunteer(session.user) && locationError && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Location Error
                    </span>
                  )}
                </>
              ) : (
                "Real-time disaster response monitoring"
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Accessibility Button */}
            <button
              onClick={() => setShowAccessibilityPanel(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Accessibility Settings (Alt + A)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {session ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowRegistrationForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  🔔 Get Alerts
                </button>
                <button
                  onClick={handleFindNearbyResources}
                  disabled={locationLoading}
                  className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {locationLoading ? '📍 Finding...' : '🏥 Find Resources'}
                </button>
                <a
                  href="/volunteer/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Volunteer Login
                </a>
                <a
                  href="/admin/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Admin Login
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <AlertsSidebar 
            alerts={session && isVolunteer(session.user) ? nearbyAlerts : alerts}
            resources={resources}
            session={session}
            volunteerLocation={volunteerLocation}
            locationError={locationError}
            onAlertCreated={refreshData} // Refresh data when new alert is created
            onResourceCreated={refreshData} // Refresh data when new resource is created
            onAlertDeleted={refreshData} // Refresh data when alert is deleted
            onAlertClick={handleAlertClick} // Handle alert click to focus on map
            onLocationRefresh={initializeVolunteerLocationData} // Refresh volunteer location
          />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapComponent 
            alerts={alerts} 
            resources={resources} 
            session={session}
            onCreateAlert={handleMapCreateAlert}
            onCreateResource={handleMapCreateResource}
            onAlertDeleted={refreshData}
            focusAlert={focusAlert}
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center space-x-4">
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </footer>

      {/* Map-based Creation Modals */}
      {mapCreationModal?.type === 'alert' && (
        <CreateAlertModal
          onClose={handleMapModalClose}
          onAlertCreated={handleMapModalCreated}
          initialCoordinates={mapCreationModal.coordinates}
        />
      )}

      {mapCreationModal?.type === 'resource' && (
        <CreateResourceModal
          onClose={handleMapModalClose}
          onResourceCreated={handleMapModalCreated}
          initialCoordinates={mapCreationModal.coordinates}
        />
      )}

      {/* Alert Registration Form for Public */}
      {showRegistrationForm && (
        <AlertRegistrationForm
          onClose={() => setShowRegistrationForm(false)}
          onSuccess={() => setShowRegistrationForm(false)}
        />
      )}

      {/* Chat Panel for Volunteers */}
      {showChat && session && isVolunteer(session.user) && (
        <ChatPanel
          session={session}
          volunteerLocation={volunteerLocation}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Floating Chat Button for Volunteers */}
      {session && isVolunteer(session.user) && !showChat && volunteerLocation && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-all duration-200 z-[10000]"
          title="Open volunteer chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Nearby Resources Panel for Public Users */}
      {showNearbyResources && publicUserLocation && (
        <NearbyResourcesPanel
          userLocation={publicUserLocation}
          onClose={() => setShowNearbyResources(false)}
        />
      )}

      {/* Accessibility Panel */}
      <AccessibilityPanel
        isOpen={showAccessibilityPanel}
        onClose={() => setShowAccessibilityPanel(false)}
      />
    </div>
  )
}

export default Dashboard