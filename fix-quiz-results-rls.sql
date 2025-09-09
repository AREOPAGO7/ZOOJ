-- Fix RLS policies for quiz_results table
-- Run this in your Supabase SQL editor

-- First, check if the quiz_results table exists and has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'quiz_results';

-- Enable RLS on quiz_results table if not already enabled
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view quiz results for their couple" ON quiz_results;
DROP POLICY IF EXISTS "Users can insert quiz results for their couple" ON quiz_results;
DROP POLICY IF EXISTS "Users can update quiz results for their couple" ON quiz_results;

-- Create RLS policies for quiz_results table
-- Policy for SELECT: Users can view quiz results where they are part of the couple
CREATE POLICY "Users can view quiz results for their couple" ON quiz_results
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Policy for INSERT: Users can insert quiz results for their couple
CREATE POLICY "Users can insert quiz results for their couple" ON quiz_results
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Policy for UPDATE: Users can update quiz results for their couple
CREATE POLICY "Users can update quiz results for their couple" ON quiz_results
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Verify the policies were created
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
WHERE tablename = 'quiz_results'
ORDER BY policyname;

-- Test the policies by trying to select from quiz_results
-- (This will help verify the fix worked)
SELECT COUNT(*) as total_quiz_results FROM quiz_results;

-- If you want to test with a specific couple, replace 'YOUR_COUPLE_ID' with an actual couple ID
-- SELECT * FROM quiz_results WHERE couple_id = 'YOUR_COUPLE_ID';

