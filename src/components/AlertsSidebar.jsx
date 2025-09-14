import { useState } from 'react'
import { isAdmin, isVolunteer, hasElevatedPermissions, supabase } from '../lib/supabaseClient'
import { findNearestChatRoom, sendAlertUpdate } from '../lib/chatService'
import CreateAlertModal from './CreateAlertModal'
import CreateResourceModal from './CreateResourceModal'

function AlertsSidebar({ alerts, resources, session, volunteerLocation, locationError, onAlertCreated, onResourceCreated, onAlertDeleted, onAlertClick, onLocationRefresh }) {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false)

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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `${diffInMinutes} min ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Handle modal close and refresh
  const handleAlertModalClose = () => {
    setIsAlertModalOpen(false)
  }

  const handleResourceModalClose = () => {
    setIsResourceModalOpen(false)
  }

  const handleAlertCreated = () => {
    setIsAlertModalOpen(false)
    if (onAlertCreated) {
      onAlertCreated() // Refresh the alerts list
    }
  }

  const handleResourceCreated = () => {
    setIsResourceModalOpen(false)
    if (onResourceCreated) {
      onResourceCreated() // Refresh the resources list
    }
  }

  // Volunteer response function
  const handleVolunteerResponse = async (alertId, responseType) => {
    if (!session || !isVolunteer(session.user)) {
      alert('Only volunteers can respond to alerts')
      return
    }

    try {
      // Update alert status
      const { error: alertError } = await supabase
        .from('alerts')
        .update({ status: responseType })
        .eq('id', alertId)

      if (alertError) throw alertError

      // Create volunteer response record
      const { error: responseError } = await supabase
        .from('volunteer_responses')
        .insert({
          alert_id: alertId,
          volunteer_id: session.user.id,
          response_type: responseType,
          location_lat: volunteerLocation?.latitude,
          location_lng: volunteerLocation?.longitude
        })

      if (responseError) throw responseError

      // Send chat notification to area volunteers
      try {
        if (volunteerLocation) {
          const chatRoom = await findNearestChatRoom(volunteerLocation)
          if (chatRoom) {
            const alert = alerts.find(a => a.id === alertId)
            const currentStatus = alert?.status || 'active'
            
            let message
            if (responseType === 'responded') {
              message = `🚨 ${session.user.email.split('@')[0]} is responding to: ${alert?.description?.substring(0, 50)}...`
            } else if (responseType === 'closed') {
              if (currentStatus === 'responded') {
                message = `✅ ${session.user.email.split('@')[0]} resolved alert: ${alert?.description?.substring(0, 50)}...`
              } else {
                message = `✅ ${session.user.email.split('@')[0]} closed alert: ${alert?.description?.substring(0, 50)}...`
              }
            }
            
            await sendAlertUpdate(chatRoom.id, session.user.id, alertId, responseType, message)
          }
        }
      } catch (chatError) {
        console.error('Error sending chat notification:', chatError)
        // Don't fail the main operation if chat fails
      }

      // Refresh data to show updated status
      if (onAlertCreated) onAlertCreated()
      
      // Get current alert status for better feedback
      const currentAlert = alerts.find(a => a.id === alertId)
      const wasBeingResponded = currentAlert?.status === 'responded'
      
      if (responseType === 'responded') {
        alert('Alert marked as being responded to successfully')
      } else if (responseType === 'closed') {
        if (wasBeingResponded) {
          alert('Alert marked as resolved successfully')
        } else {
          alert('Alert closed successfully')
        }
      }
    } catch (err) {
      console.error('Error updating alert:', err)
      
      // Get current alert status for better error feedback
      const currentAlert = alerts.find(a => a.id === alertId)
      const wasBeingResponded = currentAlert?.status === 'responded'
      
      if (responseType === 'responded') {
        alert(`Failed to mark alert as being responded to: ${err.message}`)
      } else if (responseType === 'closed') {
        if (wasBeingResponded) {
          alert(`Failed to mark alert as resolved: ${err.message}`)
        } else {
          alert(`Failed to close alert: ${err.message}`)
        }
      }
    }
  }

  // Delete alert function (admin only)
  const handleDeleteAlert = async (alertId) => {
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
        .eq('id', alertId)

      if (error) throw error

      if (onAlertDeleted) {
        onAlertDeleted() // Refresh the alerts list
      }
    } catch (err) {
      console.error('Error deleting alert:', err)
      alert(`Failed to delete alert: ${err.message}`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {session && isVolunteer(session.user) ? 'Nearby Alerts' : 'Active Alerts'}
          </h2>
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {alerts.length}
          </span>
        </div>

        {/* Volunteer Location Status */}
        {session && isVolunteer(session.user) && (
          <div className="mb-4 p-3 bg-green-50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-green-800">
                  {locationError ? 'Location Error' : volunteerLocation ? 'Location Active' : 'Getting Location...'}
                </span>
              </div>
              {(locationError || !volunteerLocation) && onLocationRefresh && (
                <button
                  onClick={onLocationRefresh}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  title="Refresh location"
                >
                  Refresh
                </button>
              )}
            </div>
            {locationError && (
              <p className="text-xs text-red-600 mt-1">{locationError}</p>
            )}
            {volunteerLocation && (
              <p className="text-xs text-green-700 mt-1">
                Showing alerts within 25km of your location
              </p>
            )}
          </div>
        )}

        {/* Create Alert Button - For Admins and Volunteers */}
        {session && hasElevatedPermissions(session.user) && (
          <div className="space-y-2">
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {isVolunteer(session.user) ? 'Report Alert' : 'Create New Alert'}
            </button>
            
            <button
              onClick={() => setIsResourceModalOpen(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {isVolunteer(session.user) ? 'Add Resource' : 'Create New Resource'}
            </button>
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No active alerts</p>
            <p className="text-xs text-gray-400 mt-1">All clear in your area</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert, index) => (
              <div 
                key={alert.id} 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onAlertClick && onAlertClick(alert)}
                title="Click to view on map"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityBadgeClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    {alert.alert_type && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {alert.alert_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {formatDate(alert.created_at)}
                    </span>
                    {session && isAdmin(session.user) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the alert click
                          handleDeleteAlert(alert.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Alert"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-900 mb-2 leading-relaxed">
                  {alert.description}
                </p>

                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {parseFloat(alert.latitude).toFixed(4)}, {parseFloat(alert.longitude).toFixed(4)}
                  </span>
                  {session && isVolunteer(session.user) && alert.distance && (
                    <span className="ml-2 text-green-600 font-medium">
                      • {alert.distance.toFixed(1)}km away
                    </span>
                  )}
                  <svg className="w-3 h-3 ml-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>

                {/* Volunteer Response Buttons */}
                {session && isVolunteer(session.user) && (
                  <>
                    {alert.status === 'active' && (
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVolunteerResponse(alert.id, 'responded');
                          }}
                          className="flex-1 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Respond
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVolunteerResponse(alert.id, 'closed');
                          }}
                          className="flex-1 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Close Alert
                        </button>
                      </div>
                    )}
                    
                    {alert.status === 'responded' && (
                      <div className="flex justify-center mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVolunteerResponse(alert.id, 'closed');
                          }}
                          className="text-xs px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Mark Resolved</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Alert Status Indicator */}
                {alert.status && alert.status !== 'active' && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      alert.status === 'responded' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {alert.status === 'responded' ? 'Being Responded To' : 'Closed'}
                    </span>
                  </div>
                )}

                {/* New alert indicator */}
                {index === 0 && alerts.length > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                      Latest
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions for non-admin users */}
      {!session && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            <a href="/admin/login" className="text-blue-600 hover:text-blue-700">
              Admin login
            </a> required to create alerts and resources
          </p>
        </div>
      )}
      {session && !hasElevatedPermissions(session.user) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            <a href="/volunteer/login" className="text-green-600 hover:text-green-700">
              Volunteer
            </a> or <a href="/admin/login" className="text-blue-600 hover:text-blue-700">
              Admin
            </a> access required to create alerts and resources
          </p>
        </div>
      )}

      {/* Create Alert Modal */}
      {isAlertModalOpen && (
        <CreateAlertModal
          onClose={handleAlertModalClose}
          onAlertCreated={handleAlertCreated}
        />
      )}

      {/* Create Resource Modal */}
      {isResourceModalOpen && (
        <CreateResourceModal
          onClose={handleResourceModalClose}
          onResourceCreated={handleResourceCreated}
        />
      )}
    </div>
  )
}

export default AlertsSidebar