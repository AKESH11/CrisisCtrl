# CrisisCtrl - Database Setup Instructions

## Overview
This guide provides step-by-step instructions for setting up the CrisisCtrl database schema in Supabase.

## Prerequisites
- Active Supabase project
- Access to Supabase SQL Editor
- Admin access to your Supabase dashboard

## SQL Files Overview

### Core Schema Files
1. **`supabase-schema.sql`** - Basic alerts and resources tables
2. **`supabase-volunteer-schema.sql`** - Complete volunteer system with chat features
3. **`alert-subscribers-schema.sql`** - Public alert registration system
4. **`supabase-public-access.sql`** - Public access policies (optional)

### Fix/Patch Files
5. **`fix-chat-policies-complete.sql`** - Fix for chat system infinite recursion

### Sample Data (Optional)
6. **`sample-data-chennai.sql`** - Chennai, India sample data

## Setup Instructions

### Step 1: Initial Database Setup
Run in Supabase SQL Editor:
```sql
-- File: supabase-schema.sql
```
**What it does:**
- Creates `alerts` and `resources` tables
- Sets up basic Row Level Security (RLS) policies
- Allows authenticated users to read, admins to write

### Step 2: Volunteer System Setup
Run in Supabase SQL Editor:
```sql
-- File: supabase-volunteer-schema.sql
```
**What it does:**
- Adds volunteer features to existing tables
- Creates chat system tables (`chat_rooms`, `chat_messages`, `chat_room_members`)
- Creates volunteer response tracking (`volunteer_responses`, `volunteer_locations`)
- Sets up location-based chat rooms
- Configures permissions for volunteers

### Step 3: Public Alert Registration Setup
Run in Supabase SQL Editor:
```sql
-- File: alert-subscribers-schema.sql
```
**What it does:**
- Creates `alert_subscribers` table for public registration
- Enables non-logged users to register for location-based alerts
- Creates function to find nearby subscribers for notifications
- Sets up proper RLS policies for public access

### Step 4: Fix Chat Policies (IMPORTANT)
Run in Supabase SQL Editor:
```sql
-- File: fix-chat-policies-complete.sql
```
**What it does:**
- Fixes infinite recursion issue in chat system policies
- Ensures chat functionality works properly
- **Required for chat system to function**

### Step 5: Enable Volunteer Alert Creation
Run in Supabase SQL Editor:
```sql
-- File: volunteer-alert-creation.sql
```
**What it does:**
- Allows volunteers to create emergency alerts
- Updates database policies to grant volunteers alert creation permissions
- Enables field reporting from volunteers

### Step 6: Enable Public Access (Optional)
If you want non-logged users to view alerts and resources:
```sql
-- File: supabase-public-access.sql
```
**What it does:**
- Allows public viewing of active alerts and resources
- Keeps admin-only creation/editing permissions
- Good for public emergency information

### Step 7: Add Sample Data (Optional)
For testing with Chennai, India data:
```sql
-- File: sample-data-chennai.sql
```
**What it does:**
- Adds 6 chat rooms for Chennai areas
- Adds 30+ emergency resources (hospitals, fire stations, etc.)
- Adds 15+ sample alerts with different severity levels

## Post-Setup Configuration

### Create Admin User
After setup, manually assign admin role to a user:
```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb 
WHERE email = 'your-admin@example.com';
```

### Create Volunteer User
Assign volunteer role to users:
```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "volunteer"}'::jsonb 
WHERE email = 'volunteer@example.com';
```

## Execution Order Summary

**Required (in order):**
1. `supabase-schema.sql`
2. `supabase-volunteer-schema.sql` 
3. `alert-subscribers-schema.sql`
4. `fix-chat-policies-complete.sql`

**Optional:**
5. `supabase-public-access.sql` (for public viewing)
6. `sample-data-chennai.sql` (for testing data)

## Troubleshooting

### Chat System Issues
- If you get "infinite recursion" errors, ensure you ran `fix-chat-policies-complete.sql`
- The chat policies were simplified to avoid recursive references

### Permission Issues
- Ensure users have correct roles in their `raw_user_meta_data`
- Check RLS policies are enabled on all tables
- Verify users are authenticated before accessing volunteer features

### Map Not Showing Data
- Check that alerts/resources are marked as `is_active = true`
- Verify user has appropriate viewing permissions
- For public access, ensure you ran `supabase-public-access.sql`

## Files Not Needed
These files are redundant or outdated:
- `fix-chat-policies.sql` (use complete version instead)
- `supabase-schema-fixed.sql` (if exists, old version)

## Support
If you encounter issues:
1. Check the browser console for JavaScript errors
2. Verify all SQL ran without errors in Supabase
3. Check user roles are set correctly
4. Ensure authentication is working