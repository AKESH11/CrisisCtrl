// Alert notification service for registered subscribers
import { supabase } from './supabaseClient'

// Get all subscribers within radius of an alert
export const getSubscribersForAlert = async (alertLatitude, alertLongitude, maxRadius = 50) => {
  try {
    const { data, error } = await supabase
      .rpc('get_nearby_subscribers', {
        alert_lat: alertLatitude,
        alert_lng: alertLongitude,
        max_distance_km: maxRadius
      })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting subscribers for alert:', error)
    throw error
  }
}

// Register a new subscriber
export const registerSubscriber = async (subscriberData) => {
  try {
    const { data, error } = await supabase
      .from('alert_subscribers')
      .insert({
        name: subscriberData.name,
        email: subscriberData.email.toLowerCase(),
        phone: subscriberData.phone,
        latitude: subscriberData.latitude,
        longitude: subscriberData.longitude,
        address: subscriberData.address || null,
        notification_radius_km: subscriberData.notificationRadius || 10,
        is_active: true
      })
      .select()

    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error registering subscriber:', error)
    throw error
  }
}

// Update subscriber preferences
export const updateSubscriberPreferences = async (email, preferences) => {
  try {
    const { data, error } = await supabase
      .from('alert_subscribers')
      .update({
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select()

    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error updating subscriber preferences:', error)
    throw error
  }
}

// Unsubscribe a user
export const unsubscribeUser = async (email) => {
  try {
    const { error } = await supabase
      .from('alert_subscribers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error unsubscribing user:', error)
    throw error
  }
}

// Get subscriber by email
export const getSubscriberByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('alert_subscribers')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No subscriber found
        return null
      }
      throw error
    }
    return data
  } catch (error) {
    console.error('Error getting subscriber:', error)
    throw error
  }
}

// Log notification sent (for tracking)
export const logNotificationSent = async (subscriberEmail, alertId, notificationType = 'email') => {
  try {
    const { error } = await supabase
      .from('alert_subscribers')
      .update({ 
        last_notification_sent: new Date().toISOString(),
        total_notifications_sent: supabase.raw('total_notifications_sent + 1')
      })
      .eq('email', subscriberEmail.toLowerCase())

    if (error) throw error

    // Could also log to a separate notifications_log table if needed
    console.log(`Notification logged for ${subscriberEmail} - Alert ${alertId} via ${notificationType}`)
    
    return true
  } catch (error) {
    console.error('Error logging notification:', error)
    // Don't throw error here as this is just logging
    return false
  }
}

// Future: Send email notification (placeholder for integration)
export const sendEmailNotification = async (subscriber, alert) => {
  console.log('Email notification would be sent to:', {
    email: subscriber.email,
    name: subscriber.name,
    alert: {
      description: alert.description,
      severity: alert.severity,
      location: `${alert.latitude}, ${alert.longitude}`,
      distance: subscriber.distance_km + ' km away'
    }
  })
  
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // Example implementation would go here
  
  return { success: true, message: 'Email notification sent' }
}

// Future: Send SMS notification (placeholder for integration)
export const sendSMSNotification = async (subscriber, alert) => {
  console.log('SMS notification would be sent to:', {
    phone: subscriber.phone,
    message: `EMERGENCY ALERT: ${alert.description} - ${alert.severity} severity. Location: ${subscriber.distance_km}km from you. Stay safe!`
  })
  
  // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
  // Example implementation would go here
  
  return { success: true, message: 'SMS notification sent' }
}

// Process alert and notify subscribers
export const processAlertNotifications = async (alert) => {
  try {
    console.log(`Processing notifications for alert: ${alert.description}`)
    
    // Get all subscribers within range
    const subscribers = await getSubscribersForAlert(alert.latitude, alert.longitude)
    
    if (subscribers.length === 0) {
      console.log('No subscribers found within range of this alert')
      return { sent: 0, errors: 0 }
    }

    let sentCount = 0
    let errorCount = 0

    // Process notifications for each subscriber
    for (const subscriber of subscribers) {
      try {
        // Send email if enabled
        if (subscriber.email_notifications) {
          await sendEmailNotification(subscriber, alert)
          await logNotificationSent(subscriber.email, alert.id, 'email')
        }

        // Send SMS if enabled
        if (subscriber.sms_notifications) {
          await sendSMSNotification(subscriber, alert)
          await logNotificationSent(subscriber.email, alert.id, 'sms')
        }

        sentCount++
      } catch (error) {
        console.error(`Failed to notify subscriber ${subscriber.email}:`, error)
        errorCount++
      }
    }

    console.log(`Alert notifications processed: ${sentCount} sent, ${errorCount} errors`)
    return { sent: sentCount, errors: errorCount, total: subscribers.length }
    
  } catch (error) {
    console.error('Error processing alert notifications:', error)
    throw error
  }
}