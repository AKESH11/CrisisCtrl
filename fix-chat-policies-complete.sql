-- Complete fix for chat system policies
-- Run this in Supabase SQL Editor to resolve infinite recursion

-- 1. Drop all existing chat-related policies
DROP POLICY IF EXISTS "Members can view room membership" ON chat_room_members;
DROP POLICY IF EXISTS "Volunteers can manage own membership" ON chat_room_members;
DROP POLICY IF EXISTS "Members can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;

-- 2. Create simplified, non-recursive policies for chat_room_members
CREATE POLICY "Users can view their own membership" ON chat_room_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Volunteers can manage their own membership" ON chat_room_members
  FOR ALL USING (
    user_id = auth.uid() OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 3. Create simplified policies for chat_messages
-- First, volunteers and admins can view messages from rooms they joined
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

-- Note: This simplified approach allows volunteers to see all messages
-- but only send messages as themselves. Room membership is enforced
-- at the application level rather than database level to avoid recursion.