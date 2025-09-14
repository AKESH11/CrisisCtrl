-- Alert Subscribers Table for Public Registration
-- Run this in Supabase SQL Editor after the main schema

-- Create alert_subscribers table
CREATE TABLE alert_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT,
  
  -- Location Information
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  notification_radius_km INTEGER NOT NULL DEFAULT 10 CHECK (notification_radius_km > 0 AND notification_radius_km <= 100),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  
  -- Tracking
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  total_notifications_sent INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_alert_subscribers_location ON alert_subscribers (latitude, longitude);
CREATE INDEX idx_alert_subscribers_email ON alert_subscribers (email);
CREATE INDEX idx_alert_subscribers_active ON alert_subscribers (is_active);

-- Enable Row Level Security
ALTER TABLE alert_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_subscribers
-- Allow public registration (anyone can insert)
CREATE POLICY "Public can register for alerts" ON alert_subscribers
  FOR INSERT WITH CHECK (true);

-- Users can view/update their own subscription by email
CREATE POLICY "Users can manage own subscription" ON alert_subscribers
  FOR ALL USING (
    email = current_setting('request.jwt.claims', true)::json->>'email' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON alert_subscribers
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_alert_subscribers_updated_at 
  BEFORE UPDATE ON alert_subscribers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to find nearby subscribers for an alert
CREATE OR REPLACE FUNCTION get_nearby_subscribers(
  alert_lat DECIMAL,
  alert_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE(
  subscriber_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.email,
    s.phone,
    ROUND(
      (6371 * acos(
        cos(radians(alert_lat)) * 
        cos(radians(s.latitude)) * 
        cos(radians(s.longitude) - radians(alert_lng)) + 
        sin(radians(alert_lat)) * 
        sin(radians(s.latitude))
      ))::numeric, 2
    ) as distance_km
  FROM alert_subscribers s
  WHERE 
    s.is_active = true
    AND (6371 * acos(
      cos(radians(alert_lat)) * 
      cos(radians(s.latitude)) * 
      cos(radians(s.longitude) - radians(alert_lng)) + 
      sin(radians(alert_lat)) * 
      sin(radians(s.latitude))
    )) <= LEAST(s.notification_radius_km, max_distance_km)
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;