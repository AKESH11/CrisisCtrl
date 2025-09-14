# CrisisCtrl - Volunteer Chat System

## Overview
The volunteer chat system enables real-time coordination between volunteers working in the same geographic area during emergency responses.

## Features

### 🗣️ Area-Based Chat Rooms
- **Automatic room assignment** based on volunteer location
- **Geographic boundaries** with configurable radius (default: 10-25km)
- **Pre-configured areas**: Manhattan, Brooklyn, Queens, Bronx, Staten Island
- **Real-time membership** tracking

### 💬 Chat Functionality
- **Real-time messaging** using Supabase real-time subscriptions
- **Message types**: Regular messages, alert updates, location shares, system notifications
- **Auto-scroll** to latest messages
- **Message timestamps** with user identification
- **Minimizable chat panel** for flexible workspace usage

### 📍 Location Integration
- **Automatic room joining** based on volunteer's current location
- **Location sharing** within chat messages
- **Distance-based room filtering** (shows nearest available room)
- **Location refresh** capability

### 🚨 Alert Integration
- **Automatic notifications** when volunteers respond to or close alerts
- **Alert status updates** broadcasted to area chat
- **Context-aware messages** with alert descriptions
- **Emergency coordination** through integrated chat and alert systems

## Database Schema

### Chat Rooms (`chat_rooms`)
```sql
- id: UUID (primary key)
- name: TEXT (room display name)
- area_name: TEXT (geographic area name)
- center_lat/lng: DECIMAL (room center coordinates)
- radius_km: INTEGER (coverage radius)
- is_active: BOOLEAN
```

### Chat Messages (`chat_messages`)
```sql
- id: UUID (primary key)
- room_id: UUID (foreign key to chat_rooms)
- user_id: UUID (foreign key to auth.users)
- message: TEXT (message content)
- message_type: TEXT (message, system, alert_update, location_share)
- metadata: JSONB (additional data for special message types)
- created_at: TIMESTAMP
```

### Room Members (`chat_room_members`)
```sql
- id: UUID (primary key)
- room_id: UUID (foreign key to chat_rooms)
- user_id: UUID (foreign key to auth.users)
- joined_at: TIMESTAMP
- last_seen: TIMESTAMP
- is_active: BOOLEAN
```

## Security & Permissions

### Row Level Security (RLS)
- **Public room viewing** for discovering available chat areas
- **Member-only message access** - volunteers can only see messages in rooms they've joined
- **Admin oversight** - admins can view all rooms and messages
- **Volunteer-only participation** - only volunteers and admins can send messages

### Auto-Join Logic
1. Volunteer logs in and grants location permission
2. System finds nearest chat room within radius
3. Volunteer automatically joins the appropriate area room
4. Real-time updates begin immediately

## User Interface

### Chat Panel (`ChatPanel.jsx`)
- **Floating chat button** appears for volunteers with location access
- **Minimizable panel** (80% screen height when expanded)
- **Room information** showing area name and online volunteer count
- **Message list** with user identification and timestamps
- **Input area** with send button and location share option
- **Special message styling** for alerts and location shares

### Integration Points
- **Dashboard integration** - chat button appears in bottom-right corner
- **AlertsSidebar integration** - volunteer responses trigger chat notifications
- **Location service integration** - automatic room assignment and location sharing

## Setup Instructions

1. **Run Database Migration**:
   ```sql
   -- Execute supabase-volunteer-schema.sql in Supabase SQL Editor
   ```

2. **Grant Location Permissions**:
   - Browser will prompt for location access when volunteer logs in
   - Location is required for chat room assignment

3. **Test Chat System**:
   - Create volunteer account with `{"role": "volunteer"}` metadata
   - Log in via `/volunteer/login`
   - Grant location permission
   - Chat button should appear automatically
   - Click to open chat panel and start messaging

## Message Types

### Regular Messages
- Standard text communication between volunteers
- Shows sender username and timestamp
- Real-time delivery to all room members

### Alert Updates
- Automatic notifications when volunteers respond to alerts
- 🚨 emoji for "responding" status
- ✅ emoji for "closed" status
- Includes alert description preview

### Location Shares
- 📍 emoji indicator
- Shows exact coordinates
- Timestamp of when location was shared
- Useful for meeting coordination

### System Messages
- Italicized styling
- Notifications about room events
- Admin announcements
- Status updates

## Coordination Features

### Online Presence
- **Member count** displayed in chat header
- **Last seen** tracking for all room members
- **Active status** indication

### Emergency Response Integration
- **Alert responses** automatically notify chat members
- **Status updates** keep everyone informed
- **Location context** for better coordination
- **Real-time updates** ensure immediate awareness

## Technical Implementation

### Real-time Subscriptions
```javascript
// Message subscription
subscribeToMessages(roomId, handleNewMessage)

// Member updates subscription  
subscribeToMembers(roomId, handleMemberUpdate)
```

### Chat Service Functions
```javascript
// Core chat operations
findNearestChatRoom(location)
joinChatRoom(roomId, userId)
sendMessage(roomId, userId, message)
getChatMessages(roomId)

// Special message types
sendAlertUpdate(roomId, userId, alertId, updateType, message)
shareLocation(roomId, userId, location)
```

### Location-Based Room Assignment
- Calculates distance to all available rooms
- Filters rooms within their specified radius
- Selects nearest room automatically
- Handles room switching if volunteer moves

The chat system provides seamless real-time coordination for volunteers responding to emergencies in the same geographic area, enhancing response effectiveness through improved communication.