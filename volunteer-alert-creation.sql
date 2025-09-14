-- Give volunteers access to create alerts
-- This file adds volunteer permissions for alert creation

-- 1. Drop existing alert creation policy
DROP POLICY IF EXISTS "Only admins can create alerts" ON alerts;

-- 2. Create new policy allowing both admins and volunteers to create alerts
CREATE POLICY "Admins and volunteers can create alerts" ON alerts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'volunteer'
    )
  );