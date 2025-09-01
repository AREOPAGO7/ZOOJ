-- Fix RLS policies for notifications table
-- Run this in your Supabase SQL editor

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

-- Create a new policy that allows inserting notifications for others
CREATE POLICY "Users can insert notifications for others" ON notifications
  FOR INSERT WITH CHECK (true);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- Test if we can now insert notifications
-- (This will help verify the fix worked)
INSERT INTO notifications (
  user_id,
  title,
  message,
  type,
  data,
  priority
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with a real user ID for testing
  'Test Notification',
  'This is a test to verify RLS policies work',
  'general',
  '{}',
  'normal'
);

-- Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification';
