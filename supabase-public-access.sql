-- CrisisCtrl - Update Database Policies for Public Access
-- Run these commands in your Supabase SQL Editor to allow public viewing

-- 1. Drop existing restrictive policies for alerts
DROP POLICY IF EXISTS "Anyone can view alerts" ON alerts;

-- 2. Create new public read policy for alerts
CREATE POLICY "Public can view active alerts" ON alerts
  FOR SELECT USING (is_active = true);

-- 3. Drop existing restrictive policies for resources  
DROP POLICY IF EXISTS "Anyone can view resources" ON resources;

-- 4. Create new public read policy for resources
CREATE POLICY "Public can view active resources" ON resources
  FOR SELECT USING (is_active = true);

-- Note: The other policies for INSERT/UPDATE/DELETE remain unchanged
-- Only admin users can still create, update, and delete alerts and resources
-- This change only allows public viewing of active alerts and resources