-- Comprehensive fix for all RLS policies in the notification system
-- Run this in your Supabase SQL editor

-- 1. Fix notifications table RLS policies
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

CREATE POLICY "Users can insert notifications for others" ON notifications
  FOR INSERT WITH CHECK (true);

-- 2. Fix quiz_invites table RLS policies (add missing policy)
CREATE POLICY "Users can update quiz invites they sent" ON quiz_invites
  FOR UPDATE USING (auth.uid() = sender_id);

-- 3. Verify all policies exist
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
WHERE tablename IN ('notifications', 'quiz_invites', 'notification_settings')
ORDER BY tablename, policyname;

-- 4. Test notification insertion (replace with a real user ID)
-- First, get a real user ID from your auth.users table
-- SELECT id FROM auth.users LIMIT 1;

-- Then test with that ID:
-- INSERT INTO notifications (
--   user_id,
--   title,
--   message,
--   type,
--   data,
--   priority
-- ) VALUES (
--   'REAL_USER_ID_HERE', -- Replace with actual user ID
--   'Test Notification',
--   'This is a test to verify RLS policies work',
--   'general',
--   '{}',
--   'normal'
-- );

-- Clean up test data
-- DELETE FROM notifications WHERE title = 'Test Notification';
