# Twilio Integration Guide for CrisisCtrl

## Overview
This guide covers integrating Twilio SMS and voice capabilities into CrisisCtrl to send emergency alerts via SMS and voice calls to registered users and emergency contacts.

## Prerequisites
- Twilio Account (sign up at https://www.twilio.com)
- Twilio Phone Number
- Node.js backend environment
- Supabase database access

## Setup Instructions

### 1. Twilio Account Setup

1. **Create Twilio Account**
   ```bash
   # Visit https://www.twilio.com/try-twilio
   # Sign up for a free account
   # Verify your phone number
   ```

2. **Get Twilio Credentials**
   - Account SID (found in Twilio Console Dashboard)
   - Auth Token (found in Twilio Console Dashboard)
   - Twilio Phone Number (purchase or use trial number)

3. **Add Environment Variables**
   ```bash
   # Add to .env.local
   VITE_TWILIO_ACCOUNT_SID=your_account_sid_here
   VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
   VITE_TWILIO_PHONE_NUMBER=+1234567890
   ```

### 2. Install Twilio SDK

```bash
# Install Twilio helper library
npm install twilio

# Install additional dependencies for server-side integration
npm install express cors dotenv
```

### 3. Database Schema Updates

Add user phone numbers and notification preferences to your Supabase database:

```sql
-- Add phone number column to user profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_notifications BOOLEAN DEFAULT false;

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    notification_type VARCHAR(10) CHECK (notification_type IN ('sms', 'voice')),
    status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    message_sid VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notification logs"
    ON notification_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all notification logs
CREATE POLICY "Admins can view all notification logs"
    ON notification_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
```

### 4. Backend API Setup

Create a Node.js/Express server for Twilio integration:

```javascript
// server/twilioService.js
const twilio = require('twilio');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Send SMS alert
async function sendSMSAlert(phoneNumber, alertData) {
    try {
        const message = `🚨 EMERGENCY ALERT 🚨
Severity: ${alertData.severity}
Location: ${alertData.latitude}, ${alertData.longitude}
Description: ${alertData.description}
Time: ${new Date(alertData.created_at).toLocaleString()}

Stay safe and follow emergency protocols.`;

        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        return {
            success: true,
            messageSid: result.sid,
            status: result.status
        };
    } catch (error) {
        console.error('SMS Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Send voice alert
async function sendVoiceAlert(phoneNumber, alertData) {
    try {
        const twiml = `
            <Response>
                <Say voice="alice">
                    Emergency Alert. This is an automated message from Crisis Control.
                    There is a ${alertData.severity} severity emergency alert.
                    ${alertData.description}
                    Please take appropriate safety measures immediately.
                    This message will repeat once.
                </Say>
                <Say voice="alice">
                    Emergency Alert. This is an automated message from Crisis Control.
                    There is a ${alertData.severity} severity emergency alert.
                    ${alertData.description}
                    Please take appropriate safety measures immediately.
                </Say>
            </Response>
        `;

        const result = await client.calls.create({
            twiml: twiml,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        return {
            success: true,
            callSid: result.sid,
            status: result.status
        };
    } catch (error) {
        console.error('Voice Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// API endpoint to send alerts
app.post('/api/send-alert', async (req, res) => {
    const { phoneNumbers, alertData, notificationType } = req.body;

    const results = [];

    for (const phoneNumber of phoneNumbers) {
        let result;
        
        if (notificationType === 'sms') {
            result = await sendSMSAlert(phoneNumber, alertData);
        } else if (notificationType === 'voice') {
            result = await sendVoiceAlert(phoneNumber, alertData);
        }

        results.push({
            phoneNumber,
            ...result
        });
    }

    res.json({ results });
});

// Webhook for delivery status updates
app.post('/api/twilio-webhook', (req, res) => {
    const { MessageSid, MessageStatus, To } = req.body;
    
    // Update notification log in Supabase
    console.log(`Message ${MessageSid} to ${To}: ${MessageStatus}`);
    
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Twilio service running on port ${PORT}`);
});

module.exports = { sendSMSAlert, sendVoiceAlert };
```

### 5. Frontend Integration

Add phone number collection to user profiles:

```javascript
// src/components/UserProfileModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

function UserProfileModal({ user, onClose, onProfileUpdated }) {
    const [phoneNumber, setPhoneNumber] = useState('')
    const [smsNotifications, setSmsNotifications] = useState(true)
    const [voiceNotifications, setVoiceNotifications] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [user])

    const loadProfile = async () => {
        if (!user) return

        const { data, error } = await supabase
            .from('profiles')
            .select('phone_number, sms_notifications, voice_notifications')
            .eq('user_id', user.id)
            .single()

        if (data) {
            setPhoneNumber(data.phone_number || '')
            setSmsNotifications(data.sms_notifications ?? true)
            setVoiceNotifications(data.voice_notifications ?? false)
        }
    }

    const saveProfile = async () => {
        setLoading(true)
        
        const { error } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                phone_number: phoneNumber,
                sms_notifications: smsNotifications,
                voice_notifications: voiceNotifications
            })

        if (error) {
            console.error('Error saving profile:', error)
        } else {
            onProfileUpdated?.()
            onClose()
        }
        
        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-medium">Profile Settings</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Close</span>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1234567890"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Include country code (e.g., +1 for US)
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Notification Preferences
                            </h4>
                            
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={smsNotifications}
                                        onChange={(e) => setSmsNotifications(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        SMS Notifications
                                    </span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={voiceNotifications}
                                        onChange={(e) => setVoiceNotifications(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Voice Call Notifications
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveProfile}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UserProfileModal
```

### 6. Alert Broadcasting Service

Add notification service to send alerts when created:

```javascript
// src/lib/notificationService.js
export async function broadcastAlert(alertData) {
    try {
        // Get all users with phone numbers and notification preferences
        const { data: users, error } = await supabase
            .from('profiles')
            .select('user_id, phone_number, sms_notifications, voice_notifications')
            .not('phone_number', 'is', null)

        if (error) {
            console.error('Error fetching users:', error)
            return
        }

        // Filter users based on alert severity and preferences
        const smsUsers = users.filter(user => 
            user.sms_notifications && user.phone_number
        )
        const voiceUsers = users.filter(user => 
            user.voice_notifications && 
            user.phone_number && 
            alertData.severity === 'High' // Only voice calls for high severity
        )

        // Send SMS notifications
        if (smsUsers.length > 0) {
            const response = await fetch('http://localhost:3001/api/send-alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumbers: smsUsers.map(user => user.phone_number),
                    alertData,
                    notificationType: 'sms'
                })
            })

            const result = await response.json()
            console.log('SMS results:', result)
        }

        // Send voice notifications for high severity alerts
        if (voiceUsers.length > 0) {
            const response = await fetch('http://localhost:3001/api/send-alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumbers: voiceUsers.map(user => user.phone_number),
                    alertData,
                    notificationType: 'voice'
                })
            })

            const result = await response.json()
            console.log('Voice results:', result)
        }

    } catch (error) {
        console.error('Error broadcasting alert:', error)
    }
}
```

### 7. Integration with Alert Creation

Update the alert creation process to trigger notifications:

```javascript
// In CreateAlertModal.jsx or AlertsSidebar.jsx
import { broadcastAlert } from '../lib/notificationService'

const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
        const { data, error } = await supabase
            .from('alerts')
            .insert([alertData])
            .select()
            .single()

        if (error) throw error

        // Broadcast alert via Twilio
        await broadcastAlert(data)

        onAlertCreated?.(data)
        onClose()
    } catch (error) {
        console.error('Error creating alert:', error)
        setError('Failed to create alert')
    } finally {
        setLoading(false)
    }
}
```

## Testing

### 1. Test SMS Functionality
```javascript
// Test script
const testSMS = async () => {
    const response = await fetch('http://localhost:3001/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phoneNumbers: ['+1234567890'],
            alertData: {
                severity: 'High',
                description: 'Test emergency alert',
                latitude: 40.7589,
                longitude: -73.9851,
                created_at: new Date().toISOString()
            },
            notificationType: 'sms'
        })
    })
    
    const result = await response.json()
    console.log('SMS Test Result:', result)
}
```

### 2. Test Voice Functionality
```javascript
// Similar test for voice calls
const testVoice = async () => {
    // Similar to SMS test but with notificationType: 'voice'
}
```

## Deployment Considerations

### 1. Environment Variables
```bash
# Production environment variables
TWILIO_ACCOUNT_SID=your_production_sid
TWILIO_AUTH_TOKEN=your_production_token
TWILIO_PHONE_NUMBER=your_production_number
```

### 2. Webhook Configuration
- Set up webhook URLs in Twilio Console
- Configure delivery status callbacks
- Handle webhook authentication

### 3. Rate Limiting
- Implement rate limiting for SMS/voice calls
- Monitor Twilio usage and costs
- Set up alerts for high usage

### 4. Error Handling
- Implement retry logic for failed notifications
- Log all notification attempts
- Monitor delivery rates

## Security Best Practices

1. **Never expose Twilio credentials in frontend code**
2. **Use server-side API for all Twilio operations**
3. **Validate phone numbers before sending**
4. **Implement proper authentication for webhook endpoints**
5. **Monitor and log all notification activity**

## Cost Optimization

1. **SMS costs**: ~$0.0075 per message
2. **Voice costs**: ~$0.013 per minute
3. **Use SMS for most alerts, voice only for critical**
4. **Implement user preferences to reduce unnecessary notifications**
5. **Monitor monthly usage and set up billing alerts**

## Troubleshooting

### Common Issues:
1. **Invalid phone number format** - Ensure E.164 format (+1234567890)
2. **Webhook not receiving updates** - Check URL accessibility
3. **Messages not delivering** - Verify phone number and carrier support
4. **High latency** - Consider message queuing for bulk notifications

This integration will enable your CrisisCtrl platform to send real-time emergency notifications via SMS and voice calls, significantly improving emergency response effectiveness.