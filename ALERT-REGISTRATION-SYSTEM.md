# Public Alert Registration System

## Overview
A comprehensive system allowing non-logged users to register for location-based emergency alerts via email and SMS notifications.

## Features Created

### 🔔 Alert Registration Form (`AlertRegistrationForm.jsx`)
- **Contact Information**: Name, email, phone number collection
- **Location Services**: 
  - GPS location detection with user permission
  - Manual coordinate entry as fallback
  - Address field for reference
- **Notification Preferences**: 
  - Customizable alert radius (5km to 50km)
  - Distance-based alert filtering
- **Form Validation**: 
  - Email format validation
  - Coordinate range validation (-90/90 lat, -180/180 lng)
  - Required field enforcement
- **User Experience**:
  - Real-time location detection
  - Clear error messages
  - Success confirmations

### 🗄️ Database Schema (`alert-subscribers-schema.sql`)
- **Subscribers Table**: Stores user registration data
- **Location Indexing**: Optimized for geographic queries
- **Security Policies**: Public registration with proper RLS
- **Smart Functions**: 
  - `get_nearby_subscribers()` - Find users within alert radius
  - Distance calculation using Haversine formula
- **Notification Tracking**: 
  - Last notification timestamps
  - Total notification counters
  - Email/SMS preference flags

### 🔧 Notification Service (`notificationService.js`)
- **Subscriber Management**:
  - Register new subscribers
  - Update preferences
  - Unsubscribe functionality
  - Email-based lookup
- **Alert Processing**:
  - Find subscribers within alert radius
  - Distance calculation and sorting
  - Batch notification processing
- **Integration Ready**:
  - Email service placeholders (SendGrid, AWS SES)
  - SMS service placeholders (Twilio, AWS SNS)
  - Notification logging and tracking

### 🎨 UI Integration
- **Header Button**: "🔔 Get Alerts" prominently displayed for non-logged users
- **Modal Interface**: Clean, accessible registration form
- **Visual Hierarchy**: Orange color scheme to distinguish from login buttons
- **Responsive Design**: Mobile-friendly modal layout

## Database Schema Details

### `alert_subscribers` Table Structure:
```sql
- id (UUID, Primary Key)
- name, email, phone (Contact info)
- latitude, longitude (Location)
- notification_radius_km (Alert range)
- address (Optional reference)
- is_active (Subscription status)
- email_notifications, sms_notifications (Preferences)
- last_notification_sent, total_notifications_sent (Tracking)
```

### Key Features:
- **Unique Email Constraint**: Prevents duplicate registrations
- **Geographic Indexing**: Fast location-based queries
- **Public Registration**: Anyone can sign up without authentication
- **Admin Management**: Admins can view all subscriptions
- **Self-Service**: Users can manage their own subscriptions

## Usage Flow

### 1. User Registration:
1. Non-logged user visits dashboard
2. Clicks "🔔 Get Alerts" button
3. Fills registration form with personal details
4. Allows location access or enters coordinates manually
5. Selects notification radius
6. Submits registration

### 2. Alert Processing (Future):
1. Admin creates emergency alert
2. System finds subscribers within alert radius
3. Sends email/SMS notifications to affected users
4. Logs notification delivery
5. Tracks engagement and delivery success

## Technical Implementation

### Frontend Components:
- **Dashboard Integration**: Non-intrusive registration button
- **Form Validation**: Client-side validation with server-side backup
- **Location Services**: Browser geolocation API with fallbacks
- **Error Handling**: User-friendly error messages

### Backend Services:
- **Supabase Integration**: Direct database operations with RLS
- **Geographic Queries**: Efficient distance-based subscriber filtering
- **Notification Pipeline**: Extensible architecture for multiple channels

### Security Features:
- **Row Level Security**: Proper access controls
- **Input Validation**: SQL injection prevention
- **Rate Limiting**: Built-in Supabase protections
- **Data Privacy**: Minimal data collection

## Future Enhancements

### 🚀 Ready for Production:
- **Email Integration**: SendGrid, AWS SES, or Mailgun
- **SMS Integration**: Twilio, AWS SNS for text alerts
- **Notification Analytics**: Delivery rates, engagement metrics
- **Subscription Management**: User dashboard for preferences
- **Alert Categories**: Filter by emergency type (fire, flood, etc.)
- **Multi-language Support**: Internationalization ready

### 📊 Advanced Features:
- **Geofencing**: Polygon-based alert zones
- **Weather Integration**: Automatic weather alerts
- **Social Features**: Community alert sharing
- **Mobile App**: Push notifications via Firebase

## Setup Instructions
1. Run `alert-subscribers-schema.sql` in Supabase
2. Deploy updated frontend with registration form
3. Configure email/SMS services for production
4. Test registration flow with real coordinates

The system is now ready for public emergency alert registrations! 🚨