-- CrisisCtrl - Volunteer System Database Schema
-- Run these commands in your Supabase SQL Editor after the main schema

-- 1. Create volunteer_responses table to track volunteer actions
CREATE TABLE volunteer_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('responded', 'closed', 'en_route')),
  message TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  estimated_arrival TIMESTAMP WITH TIME ZONE
);

-- 2. Add status field to alerts table for volunteer management
ALTER TABLE alerts ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'responded', 'closed'));

-- 3. Add volunteer location fields to track current volunteer positions
CREATE TABLE volunteer_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 4. Enable RLS on new tables
ALTER TABLE volunteer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_locations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for volunteer_responses
-- Allow public to view volunteer responses (for transparency)
CREATE POLICY "Public can view volunteer responses" ON volunteer_responses
  FOR SELECT USING (true);

-- Allow volunteers and admins to create responses
CREATE POLICY "Volunteers and admins can create responses" ON volunteer_responses
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer'
    )
  );

-- Allow volunteers to update their own responses
CREATE POLICY "Volunteers can update own responses" ON volunteer_responses
  FOR UPDATE USING (
    auth.uid() = volunteer_id OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 6. Create RLS policies for volunteer_locations
-- Allow public to view volunteer locations (for emergency coordination)
CREATE POLICY "Public can view volunteer locations" ON volunteer_locations
  FOR SELECT USING (is_active = true);

-- Allow volunteers to manage their own location
CREATE POLICY "Volunteers can manage own location" ON volunteer_locations
  FOR ALL USING (
    auth.uid() = volunteer_id OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 7. Update alerts policies to allow volunteers to update status
DROP POLICY IF EXISTS "Users can update own alerts, admins can update any" ON alerts;

CREATE POLICY "Users can update own alerts, admins and volunteers can update any" ON alerts
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer'
  );

-- 8. Update resources policies to allow volunteers to create resources
DROP POLICY IF EXISTS "Only admins can manage resources" ON resources;

CREATE POLICY "Admins and volunteers can manage resources" ON resources
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer'
  );

-- 9. Create chat system for volunteer coordination
-- Chat rooms based on geographic areas
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  area_name TEXT NOT NULL, -- e.g., "Downtown", "North District", etc.
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius_km INTEGER DEFAULT 10, -- Room covers this radius in km
  is_active BOOLEAN DEFAULT TRUE
);

-- Chat messages within rooms
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'alert_update', 'location_share')),
  metadata JSONB -- For storing additional data like coordinates, alert references, etc.
);

-- Volunteer presence in chat rooms
CREATE TABLE chat_room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(room_id, user_id)
);

-- 10. Enable RLS on chat tables
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for chat system
-- Anyone can view chat rooms
CREATE POLICY "Public can view chat rooms" ON chat_rooms
  FOR SELECT USING (is_active = true);

-- Only volunteers and admins can view messages 
CREATE POLICY "Authenticated users can view messages" ON chat_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );

-- Volunteers and admins can send messages
CREATE POLICY "Volunteers can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    ) AND
    user_id = auth.uid()
  );

-- Users can view their own membership
CREATE POLICY "Users can view their own membership" ON chat_room_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Volunteers can join/leave rooms
CREATE POLICY "Volunteers can manage their own membership" ON chat_room_members
  FOR ALL USING (
    user_id = auth.uid() OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

  );

-- Note: You can add your own chat rooms, resources, and alerts as needed
-- To create admin and volunteer users, set user metadata:
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb 
-- WHERE email = 'admin@example.com';

-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "volunteer"}'::jsonb 
-- WHERE email = 'volunteer@example.com';

-- 13. Insert sample resources for Chennai area
INSERT INTO resources (name, type, latitude, longitude) VALUES
  -- Hospitals
  ('Apollo Hospital Chennai', 'Hospital', 13.0067, 80.2206),
  ('Fortis Malar Hospital', 'Hospital', 13.0418, 80.2341),
  ('MIOT International', 'Hospital', 12.9759, 80.2201),
  ('Stanley Medical College Hospital', 'Hospital', 13.0827, 80.2707),
  ('Sri Ramachandra Medical Centre', 'Hospital', 12.9185, 80.2267),
  ('Sankara Nethralaya', 'Hospital', 13.0850, 80.2101),
  
  -- Emergency Centers
  ('Chennai Disaster Management Center', 'Emergency Center', 13.0827, 80.2707),
  ('Tamil Nadu Emergency Control Room', 'Emergency Center', 13.0522, 80.2437),
  ('Zone-1 Emergency Response Center', 'Emergency Center', 13.0850, 80.2101),
  ('Zone-2 Emergency Response Center', 'Emergency Center', 13.0067, 80.2206),
  ('OMR Emergency Response Unit', 'Emergency Center', 12.8956, 80.2267),
  
  -- Fire Stations
  ('Chennai Fire Station - Egmore', 'Fire Station', 13.0732, 80.2609),
  ('Chennai Fire Station - T.Nagar', 'Fire Station', 13.0418, 80.2341),
  ('Chennai Fire Station - Anna Nagar', 'Fire Station', 13.0850, 80.2101),
  ('Chennai Fire Station - Adyar', 'Fire Station', 13.0067, 80.2206),
  ('Chennai Fire Station - Velachery', 'Fire Station', 12.9759, 80.2201),
  
  -- Police Stations
  ('Chennai Central Police Station', 'Police Station', 13.0827, 80.2707),
  ('T.Nagar Police Station', 'Police Station', 13.0418, 80.2341),
  ('Anna Nagar Police Station', 'Police Station', 13.0850, 80.2101),
  ('Adyar Police Station', 'Police Station', 13.0067, 80.2206),
  ('Velachery Police Station', 'Police Station', 12.9759, 80.2201),
  ('OMR Police Station', 'Police Station', 12.8956, 80.2267),
  
  -- Emergency Shelters
  ('Chennai Central Relief Camp', 'Shelter', 13.0827, 80.2707),
  ('Anna Nagar Community Center', 'Shelter', 13.0850, 80.2101),
  ('Adyar Relief Center', 'Shelter', 13.0067, 80.2206),
  ('Velachery Emergency Shelter', 'Shelter', 12.9759, 80.2201),
  ('OMR Temporary Shelter', 'Shelter', 12.8956, 80.2267);

-- 14. Insert sample alerts for Chennai area (various severity levels)
INSERT INTO alerts (description, severity, alert_type, latitude, longitude, status) VALUES
  -- L1 (Minor) alerts
  ('Minor waterlogging reported on Anna Salai', 'L1', 'Flood', 13.0522, 80.2437, 'active'),
  ('Traffic signal malfunction at T.Nagar junction', 'L1', 'Infrastructure Failure', 13.0418, 80.2341, 'active'),
  ('Small kitchen fire in residential building - contained', 'L1', 'Fire', 13.0850, 80.2101, 'responded'),
  
  -- L2 (Low-Moderate) alerts
  ('Vehicle breakdown causing traffic congestion on OMR', 'L2', 'Infrastructure Failure', 12.8956, 80.2267, 'active'),
  ('Water pipeline burst in Adyar area', 'L2', 'Infrastructure Failure', 13.0067, 80.2206, 'active'),
  ('Medical emergency - elderly patient needs ambulance', 'L2', 'Medical Emergency', 13.0732, 80.2609, 'responded'),
  
  -- L3 (Moderate) alerts
  ('Heavy rainfall causing flooding in low-lying areas', 'L3', 'Flood', 13.0827, 80.2707, 'active'),
  ('Multi-vehicle accident on ECR highway', 'L3', 'Medical Emergency', 12.9185, 80.2267, 'active'),
  ('Apartment building fire - 3rd floor affected', 'L3', 'Fire', 12.9759, 80.2201, 'responded'),
  
  -- L4 (High) alerts
  ('Severe flooding in Central Chennai - multiple roads blocked', 'L4', 'Flood', 13.0827, 80.2707, 'active'),
  ('Industrial fire at manufacturing unit - toxic smoke', 'L4', 'Fire', 12.8956, 80.2267, 'active'),
  ('Building collapse risk - evacuations underway', 'L4', 'Infrastructure Failure', 13.0418, 80.2341, 'responded'),
  
  -- L5 (Critical) alerts
  ('Cyclone Vardah approaching - coastal areas evacuation', 'L5', 'Storm', 13.0522, 80.2437, 'active'),
  ('Major bridge structural failure - Marina Bridge', 'L5', 'Infrastructure Failure', 13.0522, 80.2437, 'active'),
  ('Chemical plant explosion - 5km radius evacuation', 'L5', 'Security Threat', 12.9185, 80.2267, 'responded');

-- 9. Insert sample volunteer for testing
-- Note: You'll need to manually set a user's metadata to {"role": "volunteer"} in Supabase Auth dashboard
-- Or use this SQL (replace email with actual volunteer email):
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "volunteer"}'::jsonb 
-- WHERE email = 'volunteer@example.com';