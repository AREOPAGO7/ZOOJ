-- Remove any triggers on daily_questions table that reference daily_question_notifications
-- This will fix the error: column "user_id" of relation "daily_question_notifications" does not exist

-- First, let's see what triggers exist
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'daily_questions';

-- Drop any triggers that might be causing the issue
-- Common trigger names that might exist:
DROP TRIGGER IF EXISTS create_daily_question_notification ON daily_questions;
DROP TRIGGER IF EXISTS daily_question_notification_trigger ON daily_questions;
DROP TRIGGER IF EXISTS notify_daily_question ON daily_questions;
DROP TRIGGER IF EXISTS daily_question_insert_trigger ON daily_questions;

-- Also check for any functions that might be called by triggers
DROP FUNCTION IF EXISTS create_daily_question_notification();
DROP FUNCTION IF EXISTS notify_daily_question();
DROP FUNCTION IF EXISTS daily_question_notification_trigger();

-- Verify triggers are removed
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'daily_questions';
