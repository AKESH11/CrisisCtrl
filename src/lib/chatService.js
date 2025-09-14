// Chat service for volunteer coordination
import { supabase } from './supabaseClient'
import { calculateDistance } from './locationService'

// Find appropriate chat room based on volunteer location
export const findNearestChatRoom = async (volunteerLocation) => {
  try {
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    if (!rooms || rooms.length === 0) return null

    // Find the closest room within radius
    const roomsWithDistance = rooms.map(room => ({
      ...room,
      distance: calculateDistance(
        volunteerLocation.latitude,
        volunteerLocation.longitude,
        room.center_lat,
        room.center_lng
      )
    }))

    // Filter rooms within their radius and find the closest one
    const validRooms = roomsWithDistance
      .filter(room => room.distance <= room.radius_km)
      .sort((a, b) => a.distance - b.distance)

    return validRooms.length > 0 ? validRooms[0] : null
  } catch (error) {
    console.error('Error finding nearest chat room:', error)
    return null
  }
}

// Join a chat room
export const joinChatRoom = async (roomId, userId) => {
  try {
    const { data, error } = await supabase
      .from('chat_room_members')
      .upsert({
        room_id: roomId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'room_id,user_id'
      })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error joining chat room:', error)
    throw error
  }
}

// Leave a chat room
export const leaveChatRoom = async (roomId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_room_members')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error leaving chat room:', error)
    throw error
  }
}

// Send a message to a chat room
export const sendMessage = async (roomId, userId, message, messageType = 'message', metadata = null) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        message: message,
        message_type: messageType,
        metadata: metadata
      })
      .select() // Add .select() to return the inserted data

    if (error) throw error

    // Update last seen for the user
    await updateLastSeen(roomId, userId)

    return data
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

// Get messages for a chat room
export const getChatMessages = async (roomId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:auth.users(email)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ? data.reverse() : [] // Return in chronological order
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return []
  }
}

// Get active members in a chat room
export const getChatRoomMembers = async (roomId) => {
  try {
    const { data, error } = await supabase
      .from('chat_room_members')
      .select(`
        *,
        user:auth.users(email)
      `)
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting chat room members:', error)
    return []
  }
}

// Update last seen timestamp
export const updateLastSeen = async (roomId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_room_members')
      .update({ last_seen: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating last seen:', error)
  }
}

// Subscribe to real-time messages in a room
export const subscribeToMessages = (roomId, onMessage) => {
  const channel = supabase
    .channel(`chat-room-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessage(payload.new)
      }
    )
    .subscribe()

  return channel
}

// Subscribe to member updates in a room
export const subscribeToMembers = (roomId, onMemberUpdate) => {
  const channel = supabase
    .channel(`chat-members-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_room_members',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMemberUpdate(payload)
      }
    )
    .subscribe()

  return channel
}

// Send alert-related message
export const sendAlertUpdate = async (roomId, userId, alertId, updateType, message) => {
  const metadata = {
    alert_id: alertId,
    update_type: updateType // 'responded', 'closed', 'new_alert', etc.
  }

  return await sendMessage(roomId, userId, message, 'alert_update', metadata)
}

// Send location share message
export const shareLocation = async (roomId, userId, location, message = 'Shared current location') => {
  const metadata = {
    latitude: location.latitude,
    longitude: location.longitude,
    shared_at: new Date().toISOString()
  }

  return await sendMessage(roomId, userId, message, 'location_share', metadata)
}