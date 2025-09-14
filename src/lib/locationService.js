// Location services for volunteer system
import { supabase } from './supabaseClient'

// Get user's current location using geolocation API
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        let message = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        reject(new Error(message))
      },
      options
    )
  })
}

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

// Filter alerts by distance from volunteer location
export const filterNearbyAlerts = (alerts, volunteerLocation, maxDistance = 25) => {
  if (!volunteerLocation || !alerts) return alerts

  return alerts.filter(alert => {
    const distance = calculateDistance(
      volunteerLocation.latitude,
      volunteerLocation.longitude,
      alert.latitude,
      alert.longitude
    )
    return distance <= maxDistance
  }).map(alert => ({
    ...alert,
    distance: calculateDistance(
      volunteerLocation.latitude,
      volunteerLocation.longitude,
      alert.latitude,
      alert.longitude
    )
  })).sort((a, b) => a.distance - b.distance)
}

// Save volunteer location to database
export const saveVolunteerLocation = async (userId, location) => {
  try {
    const { data, error } = await supabase
      .from('volunteer_locations')
      .upsert({
        volunteer_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'volunteer_id'
      })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving volunteer location:', error)
    throw error
  }
}

// Get volunteer location from database
export const getVolunteerLocation = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('volunteer_locations')
      .select('*')
      .eq('volunteer_id', userId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data
  } catch (error) {
    console.error('Error getting volunteer location:', error)
    return null
  }
}

// Request permission and get current location for volunteer
export const initializeVolunteerLocation = async (userId) => {
  try {
    // First try to get saved location
    let savedLocation = await getVolunteerLocation(userId)
    
    // If no saved location or it's older than 30 minutes, get fresh location
    if (!savedLocation || new Date() - new Date(savedLocation.updated_at) > 30 * 60 * 1000) {
      const currentLocation = await getCurrentLocation()
      await saveVolunteerLocation(userId, currentLocation)
      return currentLocation
    }
    
    return {
      latitude: savedLocation.latitude,
      longitude: savedLocation.longitude
    }
  } catch (error) {
    console.error('Error initializing volunteer location:', error)
    throw error
  }
}