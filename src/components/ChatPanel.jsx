import { useState, useEffect, useRef } from 'react'
import { supabase, isVolunteer, isAdmin } from '../lib/supabaseClient'
import { 
  findNearestChatRoom, 
  joinChatRoom, 
  sendMessage, 
  getChatMessages, 
  getChatRoomMembers,
  subscribeToMessages,
  subscribeToMembers,
  updateLastSeen,
  shareLocation,
  sendAlertUpdate
} from '../lib/chatService'

function ChatPanel({ session, volunteerLocation, onClose }) {
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)

  const messagesEndRef = useRef(null)
  const messageChannelRef = useRef(null)
  const memberChannelRef = useRef(null)

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize chat room when component mounts
  useEffect(() => {
    if (session && isVolunteer(session.user) && volunteerLocation) {
      initializeChatRoom()
    }
    
    return () => {
      // Cleanup subscriptions
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
      }
      if (memberChannelRef.current) {
        supabase.removeChannel(memberChannelRef.current)
      }
    }
  }, [session, volunteerLocation])

  const initializeChatRoom = async () => {
    try {
      setLoading(true)
      setError(null)

      // Find nearest chat room
      const room = await findNearestChatRoom(volunteerLocation)
      
      if (!room) {
        setError('No chat room available for your area')
        setLoading(false)
        return
      }

      setCurrentRoom(room)

      // Join the room
      await joinChatRoom(room.id, session.user.id)

      // Load initial messages and members
      const [initialMessages, initialMembers] = await Promise.all([
        getChatMessages(room.id),
        getChatRoomMembers(room.id)
      ])

      setMessages(initialMessages)
      setMembers(initialMembers)

      // Set up real-time subscriptions
      messageChannelRef.current = subscribeToMessages(room.id, handleNewMessage)
      memberChannelRef.current = subscribeToMembers(room.id, handleMemberUpdate)

      // Update last seen
      await updateLastSeen(room.id, session.user.id)

      setLoading(false)
    } catch (err) {
      console.error('Error initializing chat room:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleNewMessage = (message) => {
    // Don't add message if it's from current user (already in state)
    setMessages(prev => {
      if (prev.find(m => m.id === message.id)) return prev
      return [...prev, message]
    })
  }

  const handleMemberUpdate = (payload) => {
    // Refresh members list when membership changes
    if (currentRoom) {
      getChatRoomMembers(currentRoom.id).then(setMembers)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !currentRoom) return

    try {
      const messageData = await sendMessage(
        currentRoom.id, 
        session.user.id, 
        newMessage.trim()
      )

      // Add message to local state immediately for better UX
      if (messageData && messageData.length > 0) {
        const messageWithUser = {
          ...messageData[0],
          user: { email: session.user.email }
        }
        setMessages(prev => [...prev, messageWithUser])
      }
      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message: ' + err.message)
    }
  }

  const handleShareLocation = async () => {
    console.log('Share location clicked')
    console.log('Current room:', currentRoom)
    console.log('Volunteer location:', volunteerLocation)
    
    if (!currentRoom) {
      alert('No chat room available')
      return
    }
    
    if (!volunteerLocation) {
      alert('Location not available. Please allow location access and refresh.')
      return
    }

    try {
      console.log('Attempting to share location...')
      const result = await shareLocation(currentRoom.id, session.user.id, volunteerLocation)
      console.log('Location shared successfully:', result)
    } catch (err) {
      console.error('Error sharing location:', err)
      alert('Failed to share location: ' + err.message)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageIcon = (messageType) => {
    switch (messageType) {
      case 'alert_update':
        return '🚨'
      case 'location_share':
        return '📍'
      case 'system':
        return 'ℹ️'
      default:
        return null
    }
  }

  if (!session || !isVolunteer(session.user)) {
    return null
  }

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center" style={{ zIndex: 100000 }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Connecting to chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4" style={{ zIndex: 100000 }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-red-600">Chat Error</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{error}</p>
        <button
          onClick={initializeChatRoom}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ${
      isMinimized ? 'h-12' : 'h-96'
    }`} style={{ zIndex: 100000 }}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">
              {currentRoom?.area_name} Chat
            </h3>
            <p className="text-xs text-gray-500">
              {members.length} volunteer{members.length !== 1 ? 's' : ''} online
              {/* Debug info */}
              {volunteerLocation ? ' • Location OK' : ' • No Location'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-gray-600 p-1"
            title={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={isMinimized ? "M8 7l4-4m0 0l4 4m-4-4v18" : "M16 17l-4 4m0 0l-4-4m4 4V3"} />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 h-64">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-xs">
                            {message.user?.email?.split('@')[0] || 'Unknown'}
                          </span>
                          {getMessageIcon(message.message_type) && (
                            <span>{getMessageIcon(message.message_type)}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <p className={`text-gray-700 ${
                          message.message_type === 'alert_update' ? 'bg-red-50 p-2 rounded' :
                          message.message_type === 'location_share' ? 'bg-blue-50 p-2 rounded' :
                          message.message_type === 'system' ? 'bg-gray-50 p-2 rounded italic' : ''
                        }`}>
                          {message.message}
                        </p>
                        {message.message_type === 'location_share' && message.metadata && (
                          <div className="mt-1 text-xs text-blue-600">
                            📍 Lat: {message.metadata.latitude?.toFixed(4)}, 
                            Lng: {message.metadata.longitude?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleShareLocation}
                className="px-2 py-2 text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                title="Share location"
                disabled={!currentRoom || !volunteerLocation}
              >
                📍
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

export default ChatPanel