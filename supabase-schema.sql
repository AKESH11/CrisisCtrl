-- CrisisCtrl - Supabase SQL Schema
-- Run these commands in your Supabase SQL Editor

-- 1. Create the alerts table
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('Fire', 'Flood', 'Earthquake', 'Storm', 'Medical Emergency', 'Security Threat', 'Infrastructure Failure', 'Other')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create the resources table (hospitals, shelters, etc.)
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Hospital', 'Shelter', 'Fire Station', 'Police Station', 'Emergency Center')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for alerts table
-- Allow all authenticated users to read alerts
CREATE POLICY "Anyone can view alerts" ON alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow only admin users to insert alerts
CREATE POLICY "Only admins can create alerts" ON alerts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Allow users to update their own alerts or admins to update any
CREATE POLICY "Users can update own alerts, admins can update any" ON alerts
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Allow admins to delete alerts
CREATE POLICY "Only admins can delete alerts" ON alerts
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 5. Create RLS policies for resources table
-- Allow all authenticated users to read resources
CREATE POLICY "Anyone can view resources" ON resources
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow only admins to insert/update resources
CREATE POLICY "Only admins can manage resources" ON resources
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 6. Insert some sample resources for testing
INSERT INTO resources (name, type, latitude, longitude) VALUES
  ('City General Hospital', 'Hospital', 40.7589, -73.9851),
  ('Downtown Emergency Shelter', 'Shelter', 40.7505, -73.9934),
  ('Fire Station 19', 'Fire Station', 40.7614, -73.9776),
  ('Police Precinct 1', 'Police Station', 40.7505, -73.9934),
  ('Emergency Response Center', 'Emergency Center', 40.7549, -73.9840),
  ('Mount Sinai Hospital', 'Hospital', 40.7903, -73.9509),
  ('Brooklyn Emergency Shelter', 'Shelter', 40.6892, -73.9442),
  ('Fire Station 33', 'Fire Station', 40.7282, -73.9942),
  ('Police Precinct 14', 'Police Station', 40.7589, -73.9851),
  ('Queens Emergency Center', 'Emergency Center', 40.7282, -73.7949);

-- 7. Insert sample alerts for demonstration (L1-L5 severity levels)
INSERT INTO alerts (description, severity, alert_type, latitude, longitude) VALUES
  ('Minor water leak in subway tunnel', 'L1', 'Infrastructure Failure', 40.7505, -73.9934),
  ('Slip and fall incident reported', 'L1', 'Medical Emergency', 40.7614, -73.9776),
  ('Moderate kitchen fire in apartment building', 'L2', 'Fire', 40.7589, -73.9851),
  ('Flash flood warning - rising water levels', 'L2', 'Flood', 40.7282, -73.9942),
  ('Severe thunderstorm with high winds', 'L3', 'Storm', 40.7903, -73.9509),
  ('Multi-vehicle accident with injuries', 'L3', 'Medical Emergency', 40.6892, -73.9442),
  ('Large building fire - multiple floors affected', 'L4', 'Fire', 40.7549, -73.9840),
  ('Major earthquake - 5.2 magnitude', 'L4', 'Earthquake', 40.7282, -73.7949),
  ('Category 4 hurricane approaching', 'L5', 'Storm', 40.7200, -74.0000),
  ('Critical infrastructure collapse', 'L5', 'Infrastructure Failure', 40.7800, -73.9500);

-- Note: To make a user an admin, you need to update their user metadata
-- You can do this in the Supabase dashboard under Authentication > Users
-- Click on a user and update their "User Metadata" to include: {"role": "admin"}
-- Or run this SQL (replace the email with the actual admin email):
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb 
-- WHERE email = 'admin@example.com';